import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.email === email && user.password === password) {
        router.push('/dashboard');
      } else {
        alert('Неверная почта или пароль');
      }
    }
  };

  return (
    <main className="flex items-center justify-center h-screen p-8">
      <h1 className="text-3xl font-bold mb-4 text-center">Вход в аккаунт</h1>
      <div className="w-full max-w-md flex flex-col items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-4">
          <input
            type="email"
            placeholder="Эл. почта"
            className="w-full border rounded p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            className="w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl w-full">
            Войти
          </button>
        </form>
      </div>
    </main>
  );
}