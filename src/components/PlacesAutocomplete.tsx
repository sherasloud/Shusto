import React, { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export function PlacesAutocomplete({ onPlaceSelected, placeholder }: { onPlaceSelected: (place: google.maps.places.PlaceResult | null) => void; placeholder: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      types: ['geocode'],
      componentRestrictions: { country: 'BD' },
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      onPlaceSelected(place);
    });
  }, [placesLib, onPlaceSelected]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl focus:bg-white/20 focus:outline-none text-sm font-bold text-white placeholder:text-slate-400"
    />
  );
}
