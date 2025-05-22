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
    <div>
      <h1>Вход администратора</h1>
      {error && <p className="error-text">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)}/>
        <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)}/>
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}
