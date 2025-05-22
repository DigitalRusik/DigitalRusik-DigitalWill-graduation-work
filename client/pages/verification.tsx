import axios from 'axios';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';



export default function Verification() {
  const [file, setFile] = useState<File | null>(null);
  const [username, setUsername] = useState('');

  const [status, setStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        router.push('/login');
      } else {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUsername(parsedUser.fullName || 'Пользователь');
        } catch (err) {
          console.error('Ошибка при парсинге пользователя:', err);
          router.push('/login');
        }
      }
    }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/kyc/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        
      });
      setStatus('Документ успешно отправлен');
    } catch (err) {
        if (err.response?.data?.message) {
          setStatus(err.response.data.message);
        } else {
          setStatus('Ошибка при отправке документа');
        }
      }
  };

  return (
    <main className="page-container">
  <div className="header-bar">
    <div className="header-left">
      <Link href="/dashboard">
        <img src="/images/logo.png" alt="Логотип" className="header-logo" />
      </Link>
    </div>
    <div className="header-center">
      <h1>Верификация личности</h1>
    </div>
    <div className="header-right">
      <span>{username}</span>
    </div>
  </div>
  <div>
    <hr />
  </div>
  <div className="div-body">
    <div className="exit-button">
      <Link href="/dashboard">
        <button>
          Обратно на главную страницу
        </button>
      </Link>
    </div>
    <p>
      Загрузите фото себя с паспортом. Изображение должно быть четкое, в нём должно быть хорошо видно ваше лицо и данные паспорта.
      Допустимые форматы: <b>PNG, JPG, PDF</b>.
    </p>
    <form onSubmit={handleSubmit} className="verify-form">
      <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
      <button type="submit" className="verify-button-submit">
        Отправить
      </button>
    </form>
    {status && <p className="verify-status">{status}</p>}
  </div>
</main>

  );
}
