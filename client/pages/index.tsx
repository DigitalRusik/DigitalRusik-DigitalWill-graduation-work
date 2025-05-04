import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    patronymic: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      router.push('/dashboard');
    }
  }, []);

  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
  
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Ошибка регистрации');
        return;
    }
    localStorage.setItem('user', JSON.stringify(data));
    router.push('/dashboard');
  } catch (error) {
      console.error('Ошибка при регистрации:', error);
      setError('Ошибка при подключении к серверу');
    }
    finally {
      setIsLoading(false);
    }
  };
  
  return (
    <main className="main-container">
      <div className="head-page">
      <h1>Регистрация</h1>
      </div>
      <hr></hr>
      <div className="center-content">
        {error && <p className="error-text">{error}</p>}
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            name="lastName"
            type="text"
            placeholder="Фамилия"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
          <input
            name="firstName"
            type="text"
            placeholder="Имя"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          <input
            name="patronymic"
            type="text"
            placeholder="Отчество"
            value={formData.patronymic}
            onChange={handleChange}
          />
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
          >
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <div className="exist-acc">
          <button
          onClick={() => router.push('/login')}>
          Войти в существующий аккаунт
        </button>
        </div>
      </div>
    </main>
  );
}