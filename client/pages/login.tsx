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
      <img src="/images/logo.png" alt="Логотип" className="register-logo" />
      <div className="register-card">
        <div className="register-header">
          <h1>Вход в учётную запись</h1>
        </div>
        <hr />
        <div className="register-body">
          {error && <p className="error-text error-animate">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              name="email"
              type="email"
              placeholder="Эл. почта"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Пароль"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="register-button"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
      <div className="exist-acc">
        <button onClick={() => router.push('/')}>
          Создание учётной записи
        </button>
      </div>
    </main>
  );
}