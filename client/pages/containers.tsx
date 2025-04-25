import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';


export default function Containers() {
  const [user, setUser] = useState<any>(null);
  const [containerName, setContainerName] = useState('');
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [totalSizeMB, setTotalSizeMB] = useState(0);
  const [error, setError] = useState('');
  const [containers, setContainers] = useState<any[]>([]);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [containerToDelete, setContainerToDelete] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/');
    } else {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      fetchContainers(parsed.id);
    }
  }, []);

  useEffect(() => {
    const size =
      (mainFile?.size || 0) +
      additionalFiles.reduce((acc, f) => acc + f.size, 0);
    setTotalSizeMB(size / 1024 / 1024);
  }, [mainFile, additionalFiles]);

  const fetchContainers = async (userId: number) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/containers/${userId}`);
      setContainers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки контейнеров:', err);
    }
  };

  const handleMainFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const valid = ['pdf', 'doc', 'docx'];
      if (!valid.includes(ext!)) {
        setError('Основной файл должен быть .pdf, .doc или .docx');
        setMainFile(null);
        return;
      }
    }

    setError('');
    setMainFile(file);
  };

  const handleAdditionalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 20) {
      setError('Можно загрузить не более 20 дополнительных файлов.');
      return;
    }

    setError('');
    setAdditionalFiles(selected);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!containerName.trim()) {
      setError('Пожалуйста, укажите имя контейнера.');
      return;
    }
    if (!mainFile) {
      setError('Ошибка! Загружен неправильный тип основного файла или он отсутствует.');
      return;
    }
    if (totalSizeMB > 50) {
      setError('Общий размер файлов не должен превышать 50 МБ.');
      return;
    }

    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('containerName', containerName);
    formData.append('mainFile', mainFile);
    additionalFiles.forEach((file) => {
      formData.append('extraFiles', file);
    });

    try {
      await axios.post('http://localhost:5000/api/containers', formData);
      alert('Контейнер создан');
      setContainerName('');
      setMainFile(null);
      setAdditionalFiles([]);
      fetchContainers(user.id);
    } catch (err) {
      console.error(err);
      setError('Ошибка при создании контейнера');
    }
  };

  const handleDeleteRequest = (id: number) => {
    setContainerToDelete(id);
    setShowPasswordPrompt(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const verify = await axios.post('http://localhost:5000/api/containers/verify-password', {
        userId: user.id,
        password,
      });

      if (verify.data.success) {
        await axios.delete(`http://localhost:5000/api/containers/${containerToDelete}`);
        setContainers(containers.filter(c => c.id !== containerToDelete));
        setShowPasswordPrompt(false);
        setPassword('');
        alert('Контейнер удалён');
      } else {
        setError('Неверный пароль');
      }
    } catch (err) {
      console.error('Ошибка при удалении:', err);
      setError('Ошибка при удалении контейнера');
    }
  };

  return (
    <main className="main-container">
        <div className="head-page">
            <h1>Зашифрованные контейнеры</h1>
        </div>
        <div>
          <hr></hr>
        </div>
        <div className="div-body">
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
          <div>
            <label className="block mb-1 font-semibold">Основной файл (обязательный):</label>
            <p className="text-sm mb-1 text-gray-600">
              Это должно быть завещание в формате .pdf, .doc или .docx
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleMainFileChange}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Дополнительные файлы (необязательно):</label>
            <p className="text-sm mb-1 text-gray-600">Максимум 20 файлов</p>
            <input type="file" multiple onChange={handleAdditionalChange} />
          </div>

          <div className="text-sm text-gray-700">
            Общий размер: {totalSizeMB.toFixed(2)} МБ (максимум 50 МБ)
          </div>

          {error && <div className="error-text">{error}</div>}

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Создать контейнер
          </button>
        </form>

        <div>
          <h2 className="text-xl font-semibold mb-2">Ваши контейнеры:</h2>
          {containers.map(container => (
          <div key={container.id} className="border p-4 rounded mb-3">
            <p><strong>Название:</strong> {container.name}</p>
            <p><strong>Создан:</strong> {new Date(container.created_at).toLocaleString()}</p>
            <p><strong>Размер:</strong> {
              JSON.parse(container.file_path)
                .reduce((acc: number, f: any) => acc + (f.size || 0), 0) / 1024
            } КБ</p>
            <button
              className="text-red-600 mt-2 underline"
              onClick={() => handleDeleteRequest(container.id)}
            >
              Удалить
            </button>
          </div>
        ))}
        </div>
        {showPasswordPrompt && (
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow-md max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Подтвердите пароль для удаления</h3>
              <input
                type="password"
                placeholder="Введите пароль"
                className="w-full border p-2 rounded mb-4"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-between">
                <button
                  onClick={handleConfirmDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Удалить
                </button>
                <button
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setPassword('');
                  }}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
