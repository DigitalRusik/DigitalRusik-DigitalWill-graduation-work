import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function AdminLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/admin-login', { login, password });
      if (res.data.role === 'admin') {
        localStorage.setItem('admin', 'admin');
        router.push('/admin/kycAdmin');
      }
    } catch {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Вход администратора</h1>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)} className="border px-2 py-1 mr-2" />
        <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className="border px-2 py-1 mr-2" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">Войти</button>
      </form>
    </div>
  );
}
