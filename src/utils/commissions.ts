import { doc, collection, increment, Transaction, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const COMMISSION_RATES = {
  STATE: 0.10,   // 10%
  MANAGER: 0.05, // 5%
  INVESTOR: 0.02 // 2%
};

export async function distributeCommissions(
  transaction: Transaction,
  patientUid: string,
  amount: number,
  adminUid: string,
  details: string
) {
  // 1. Get Patient data
  const patientRef = doc(db, 'users', patientUid);
  const patientSnap = await transaction.get(patientRef);
  
  if (!patientSnap.exists()) return amount; 

  const patientData = patientSnap.data();
  const stateUid = patientData.referredBy; 

  if (!stateUid) {
    // If no State referral, all goes to Admin
    return amount; 
  }

  let adminNetProfit = amount;

  // 2. State Commission
  const stateRef = doc(db, 'users', stateUid);
  const stateSnap = await transaction.get(stateRef);
  
  if (stateSnap.exists()) {
    const stateData = stateSnap.data();
    const stateCommission = amount * COMMISSION_RATES.STATE;
    const stateWalletRef = doc(db, 'wallets', stateUid);
    
    transaction.set(stateWalletRef, { 
      uid: stateUid,
      balance: increment(stateCommission),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Record State Transaction
    const stateTxRef = doc(collection(db, 'transactions'));
    transaction.set(stateTxRef, {
      userId: stateUid,
      amount: stateCommission,
      type: 'affiliate_commission',
      status: 'success',
      details: `Commission from Patient ${patientData.displayName || patientUid}: ${details}`,
      createdAt: new Date().toISOString()
    });

    adminNetProfit -= stateCommission;

    // 3. Manager Commission
    const managerUid = stateData.managerId || stateData.referredBy;
    if (managerUid) {
      const managerRef = doc(db, 'users', managerUid);
      const managerSnap = await transaction.get(managerRef);
      if (managerSnap.exists()) {
        const managerData = managerSnap.data();
        const managerCommission = amount * COMMISSION_RATES.MANAGER;
        const managerWalletRef = doc(db, 'wallets', managerUid);
        
        transaction.set(managerWalletRef, { 
          uid: managerUid,
          balance: increment(managerCommission),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Record Manager Transaction
        const managerTxRef = doc(collection(db, 'transactions'));
        transaction.set(managerTxRef, {
          userId: managerUid,
          amount: managerCommission,
          type: 'affiliate_commission',
          status: 'success',
          details: `Commission (via State ${stateData.displayName || stateUid}) from Patient ${patientData.displayName || patientUid}: ${details}`,
          createdAt: new Date().toISOString()
        });

        adminNetProfit -= managerCommission;

        // 4. Investor Commission
        const investorUid = managerData.investorId || managerData.referredBy;
        if (investorUid) {
          const investorRef = doc(db, 'users', investorUid);
          const investorSnap = await transaction.get(investorRef);
          if (investorSnap.exists()) {
            const investorCommission = amount * COMMISSION_RATES.INVESTOR;
            const investorWalletRef = doc(db, 'wallets', investorUid);
            
            transaction.set(investorWalletRef, { 
              uid: investorUid,
              balance: increment(investorCommission),
              updatedAt: new Date().toISOString()
            }, { merge: true });

            // Record Investor Transaction
            const investorTxRef = doc(collection(db, 'transactions'));
            transaction.set(investorTxRef, {
              userId: investorUid,
              amount: investorCommission,
              type: 'affiliate_commission',
              status: 'success',
              details: `Commission (via Manager ${managerData.displayName || managerUid}) from Patient ${patientData.displayName || patientUid}: ${details}`,
              createdAt: new Date().toISOString()
            });

            adminNetProfit -= investorCommission;
          }
        }
      }
    }
  }

  return adminNetProfit;
}
