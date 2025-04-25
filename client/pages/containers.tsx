import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Containers() {
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [containerName, setContainerName] = useState('');
  const [containers, setContainers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
    } else {
      setUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchContainers();
    }
  }, [user]);

  const fetchContainers = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/containers/${user.id}`);
      setContainers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки контейнеров:', err);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !containerName || !user) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('containerName', containerName);
    formData.append('userId', user.id);

    try {
      await axios.post('http://localhost:5000/api/containers', formData);
      alert('Контейнер создан');
      setContainerName('');
      setFile(null);
      fetchContainers();
    } catch (err) {
      console.error('Ошибка создания контейнера:', err);
    }
  };

  return (
    <main className="main-container">
        <div className="head-page">
            <h1>Зашифрованные контейнеры</h1>
        </div>
         <hr></hr>
         <div className="exit-button">
            <Link href="/dashboard">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
                    Обратно на главную страницу
                </button>
            </Link>
        </div>
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <input
          type="text"
          className="border p-2 w-full rounded"
          placeholder="Название контейнера"
          value={containerName}
          onChange={(e) => setContainerName(e.target.value)}
        />
        <input
          type="file"
          className="border p-2 w-full rounded"
          onChange={handleFileChange}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Загрузить файл
        </button>
      </form>

      <div>
        <h2 className="text-xl font-semibold mb-2">Ваши контейнеры:</h2>
        {containers.map((c: any) => (
          <div key={c.id} className="border p-4 rounded mb-2">
            <p><strong>Название:</strong> {c.name}</p>
            <p><strong>Путь:</strong> {c.file_path}</p>
            <p><strong>Дата:</strong> {new Date(c.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
