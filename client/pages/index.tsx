import { useState } from 'react';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user', JSON.stringify(formData));
    router.push('/dashboard');
  };

  return (
    <main className="center-container">
      <div className="conter-content">
        <h1 className="text-3xl font-bold mb-8 text-center">Регистрация</h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            name="lastName"
            type="text"
            placeholder="Фамилия"
            className="w-full border rounded p-2"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
          <input
            name="firstName"
            type="text"
            placeholder="Имя"
            className="w-full border rounded p-2"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          <input
            name="patronymic"
            type="text"
            placeholder="Отчество"
            className="w-full border rounded p-2"
            value={formData.patronymic}
            onChange={handleChange}
          />
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
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-xl w-full">
            Зарегистрироваться
          </button>
        </form>
        <button
          onClick={() => router.push('/login')}
          className="mt-6 text-blue-600 underline w-full text-center"
        >
          Войти в существующий аккаунт
        </button>
      </div>
    </main>
  );
}