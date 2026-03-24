import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const mainLanguages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

const moreLanguages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
];

const allLanguages = [...mainLanguages, ...moreLanguages];

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
    setShowMore(false);
  };

  const currentLang = allLanguages.find(l => l.code === i18n.language || i18n.language.startsWith(l.code + '-')) || mainLanguages[1];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`${currentLang.name}`}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-slate-800 px-2 py-2 text-white transition hover:bg-slate-700 md:h-12 lg:gap-2 lg:px-3"
      >
        <Globe className="h-5 w-5 shrink-0" />
        <span className="text-lg leading-none lg:hidden">{currentLang.flag}</span>
        <span className="hidden whitespace-nowrap lg:inline">{currentLang.flag} {currentLang.name}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-[100]">
          {mainLanguages.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition ${
                i18n.language === lang.code || i18n.language.startsWith(lang.code + '-') ? 'bg-slate-700 text-white' : 'text-gray-300'
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span>{lang.name}</span>
              {(i18n.language === lang.code || i18n.language.startsWith(lang.code + '-')) && <span className="ml-auto">✓</span>}
            </button>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-700 transition text-blue-300 text-sm border-t border-slate-700"
          >
            {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{t('language.seeMore', 'Voir plus')}</span>
          </button>
          {showMore && moreLanguages.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition ${
                i18n.language === lang.code || i18n.language.startsWith(lang.code + '-') ? 'bg-slate-700 text-white' : 'text-gray-300'
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span>{lang.name}</span>
              {(i18n.language === lang.code || i18n.language.startsWith(lang.code + '-')) && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
