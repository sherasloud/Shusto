import { db } from './src/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
  const querySnapshot = await getDocs(collection(db, "medicines"));
  console.log("Total medicines:", querySnapshot.size);
  if (querySnapshot.size > 0) {
    console.log("First medicine:", querySnapshot.docs[0].data());
  }
}
check();
