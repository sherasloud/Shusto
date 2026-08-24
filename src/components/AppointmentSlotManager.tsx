import React, { useState } from 'react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Clock, Plus, X, Calendar, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

export function AppointmentSlotManager({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('14:00');
  const [durationMins, setDurationMins] = useState(20);
  const [breakMins, setBreakMins] = useState(0);
  const [maxPatients, setMaxPatients] = useState(1);
  const [generatedSlots, setGeneratedSlots] = useState<{ startTime: string, endTime: string, timeSlot: string, selected: boolean }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const formatAMPM = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    const strTime = h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ' ' + ampm;
    return strTime;
  };

  const addMinutes = (timeStr: string, mins: number) => {
    const [hours, minutes] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10));
    d.setMinutes(parseInt(minutes, 10) + mins);
    d.setSeconds(0);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  };

  const handleGenerate = () => {
    const slots = [];
    let current = startTime;
    
    // Convert to Date objects to compare easily
    const parseTime = (t: string) => {
      const [h, m] = t.split(':');
      const d = new Date();
      d.setHours(parseInt(h, 10), parseInt(m, 10), 0);
      return d;
    };
    
    const endT = parseTime(endTime);
    
    while (parseTime(addMinutes(current, durationMins)) <= endT) {
      const startAmPm = formatAMPM(current);
      const nextTime = addMinutes(current, durationMins);
      const endAmPm = formatAMPM(nextTime);
      
      slots.push({
        startTime: startAmPm,
        endTime: endAmPm,
        timeSlot: `${startAmPm} - ${endAmPm}`,
        selected: true
      });
      
      current = addMinutes(nextTime, breakMins);
    }
    setGeneratedSlots(slots);
  };

  const toggleSlot = (index: number) => {
    const newSlots = [...generatedSlots];
    newSlots[index].selected = !newSlots[index].selected;
    setGeneratedSlots(newSlots);
  };

  const handleSave = async () => {
    if (!user) return;
    const selectedSlots = generatedSlots.filter(s => s.selected);
    if (selectedSlots.length === 0) {
      alert("Please select at least one slot.");
      return;
    }
    
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      selectedSlots.forEach(slot => {
        const slotRef = doc(collection(db, 'doctor_slots'));
        batch.set(slotRef, {
          doctorId: user.uid,
          doctorEmail: user.email?.toLowerCase().trim() || '',
          doctorName: user.displayName || 'Doctor',
          date: selectedDate,
          timeSlot: slot.timeSlot,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxPatients: maxPatients,
          bookedCount: 0,
          status: 'available',
          createdAt: new Date().toISOString()
        });
      });
      
      await batch.commit();
      addToast(`${selectedSlots.length} Appointment slots generated successfully!`);
      onClose();
    } catch (err) {
      console.error("Error saving slots:", err);
      alert("Error saving slots.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Appointment Slots</h2>
              <p className="text-xs text-slate-500">Generate multiple slots automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Date</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Max Patients / Slot</label>
              <input 
                type="number" 
                min="1"
                value={maxPatients}
                onChange={(e) => setMaxPatients(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Start Time</label>
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">End Time</label>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Duration (Mins)</label>
              <input 
                type="number" 
                min="5"
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Break Between Slots (Mins)</label>
              <input 
                type="number" 
                min="0"
                value={breakMins}
                onChange={(e) => setBreakMins(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>
          
          <button 
            onClick={handleGenerate}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md"
          >
            Generate Slots Preview
          </button>

          {generatedSlots.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">Preview Slots ({generatedSlots.filter(s => s.selected).length} selected)</h3>
                <p className="text-xs text-slate-500">Uncheck slots if you need a break</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {generatedSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleSlot(idx)}
                    className={cn(
                      "p-2 rounded-xl border text-xs font-bold text-center transition-all",
                      slot.selected 
                        ? "bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500/20" 
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    )}
                  >
                    {slot.timeSlot}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || generatedSlots.filter(s => s.selected).length === 0}
            className="px-6 py-2.5 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all text-sm shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? 'Saving...' : 'Save All Slots'}
          </button>
        </div>
      </div>
    </div>
  );
}
