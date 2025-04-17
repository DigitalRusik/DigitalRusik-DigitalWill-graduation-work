import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [username, setUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedName = localStorage.getItem('username');
    if (!storedName) {
      router.push('/');
    } else {
      setUsername(storedName);
    }
  }, []);

  return (
    <main className="flex h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold mb-6">Добро пожаловать, {username}!</h1>
      <Link href="/create">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
          Создать завещание
        </button>
      </Link>
    </main>
  );
}