import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function CreateWill() {
  const [owner, setOwner] = useState('');
  const [recipient, setRecipient] = useState('');
  const [dataHash, setDataHash] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const router = useRouter();

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (!username) {
      router.push('/');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const unlockTime = Math.floor(new Date(unlockDate).getTime() / 1000);
    await axios.post('http://localhost:5000/api/wills', {
      owner,
      recipient,
      dataHash,
      unlockTime,
    });
    alert('Завещание создано');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h2 className="text-2xl font-semibold mb-4">Создание завещания</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <input
          className="w-full border rounded p-2"
          type="text"
          placeholder="Адрес владельца"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          type="text"
          placeholder="Адрес получателя"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          type="text"
          placeholder="Хэш зашифрованных данных"
          value={dataHash}
          onChange={(e) => setDataHash(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          type="date"
          placeholder="Дата разблокировки"
          value={unlockDate}
          onChange={(e) => setUnlockDate(e.target.value)}
        />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-xl">
          Сохранить завещание
        </button>
      </form>
    </main>
  );
}