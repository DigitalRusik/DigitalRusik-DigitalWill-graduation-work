import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      router.push('/dashboard');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', formData);

      const { token, user } = response.data;

      // Сохраняем токен и пользователя
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Ошибка при входе:', error);
      if (error.response && error.response.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Ошибка при подключении к серверу');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="main-container">
      <div className="head-page">
        <h1>Вход в аккаунт</h1>
      </div>
      <hr></hr>
      <div className="center-content">
        {error && <p className="error-text">{error}</p>}
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Эл. почта"
            className="w-full border rounded p-2"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Пароль"
            className="w-full border rounded p-2"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl w-full disabled:opacity-50"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <div className="exist-acc">
          <button
          onClick={() => router.push('/')}
          className="mt-6 text-blue-600 underline w-full text-center">
          Создать аккаунт
        </button>
        </div>
      </div>
    </main>
  );
}