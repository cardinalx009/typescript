interface TelegramModalProps {
  open: boolean;
  onClose: () => void;
  onJoined: () => void;
}

export default function TelegramModal({ open, onClose, onJoined }: TelegramModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-sky-500 p-6 text-white text-center">
          <div className="text-6xl mb-3">✈️</div>
          <h2 className="text-2xl font-bold">Asadbek Posts Telegram</h2>
          <p className="text-sm opacity-95 mt-1">Rasmiy kanalimizga azo bo'ling!</p>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <div className="font-semibold text-blue-900 mb-1">
                  Kanalimizda nima topasiz?
                </div>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Ingliz tilini o'rganish uchun foydali materiallar</li>
                  <li>• Audio darsliklar va tinglash mashqlari</li>
                  <li>• Yangiliklar va maxsus chegirmalar</li>
                  <li>• O'quv markazi yangiliklari</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="https://t.me/asadbekposts"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-semibold rounded-xl transition-all text-center shadow-lg hover:shadow-xl"
              onClick={onJoined}
            >
              ✈️ Telegramda ochish
            </a>
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
            >
              Keyinroq
            </button>
          </div>
        </div>

        <div className="bg-blue-50 px-6 py-3 text-center text-xs text-blue-700 border-t border-blue-100">
          📚 Asadbek Posts Learning Center
        </div>
      </div>
    </div>
  );
}
