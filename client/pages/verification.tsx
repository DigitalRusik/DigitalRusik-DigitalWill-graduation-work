import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function Verification() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

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
    <main className="main-container">
      <div className="head-page">
        <h1 className="text-xl font-bold mb-4">Верификация личности</h1>
      </div>
      <div>
        <hr></hr>
      </div>
      <div className="div-body">
        <div className="exit-button">
          <Link href="/dashboard">
            <button>
              Обратно на главную страницу
            </button>
          </Link>
        </div>     
        <p className="text-gray-700 mb-2">
          Загрузите фото себя с паспортом. Изображение должно быть четкое
          , в нём должно быть хорошо видно ваше лицо и данные паспорта. Допустимые форматы: <b>PNG, JPG, PDF</b>.
        </p>
        <form onSubmit={handleSubmit}>
          <input type="file" accept=".png,.jpg,.jpeg,.pdf" 
            onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded ml-4">
            Отправить
          </button>
        </form>
        {status && <p className="mt-4">{status}</p>}
      </div>
    </main>
  );
}
