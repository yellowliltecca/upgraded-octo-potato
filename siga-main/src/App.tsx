import { Check, Copy, Eraser, Flame, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ApproachDuoPhoto } from './components/ApproachDuoPhoto';
import { BurnableSection } from './components/BurnableSection';
import { CigaretteHeroPhoto } from './components/CigaretteHeroPhoto';
import { LighterCursor, notifyLighterHover } from './components/LighterCursor';
import { ScorchMarksCanvas } from './components/ScorchMarksCanvas';
import { SiteHeader } from './components/SiteHeader';
import {
  playLighterCloseSound,
  playLighterIgniteSound,
} from './utils/lighterAudio';

const TOTAL_BURNABLE_BLOCKS = [
  'site-header',
  'page-hero',
  'page-about',
  'page-stack',
  'page-approach',
  'page-contact',
] as const;

const STACK_ITEMS = [
  {
    index: '01',
    title: 'Дизайн и прототипы',
    tools: 'Figma · Сетки · Типографика',
    description:
      'Продумываю структуру, подбираю шрифты, контрасты и настроение ещё до первой строчки кода.',
  },
  {
    index: '02',
    title: 'Вёрстка и фронтенд',
    tools: 'HTML · CSS · Tailwind · TypeScript · React',
    description:
      'Переношу макет в живой код с аккуратным адаптивом — чтобы сайт одинаково чисто смотрелся на телефоне и мониторе.',
  },
  {
    index: '03',
    title: 'Анимации и интерактив',
    tools: 'Canvas · Motion · Кастомные курсоры',
    description:
      'Делаю так, чтобы страница ощущалась живой: от мягких переходов до огня, пепла и дыма, как здесь.',
  },
  {
    index: '04',
    title: 'Сборка и запуск',
    tools: 'Vite · Git · REST API · Деплой',
    description:
      'Подключаю формы и данные, привожу проект в порядок и выкладываю его на готовый адрес в сеть.',
  },
];

const MARQUEE_TEXT =
  'РАЗРАБОТКА САЙТОВ · ВЕБ-ДИЗАЙН · FIGMA · REACT · TYPESCRIPT · CANVAS · ЗАХАР 20 ЛЕТ · ';

export default function App() {
  const [cigaretteLit, setCigaretteLit] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [lighterEnabled, setLighterEnabled] = useState(true);

  const [hasScorchMarks, setHasScorchMarks] = useState(false);
  const [clearScorchSignal, setClearScorchSignal] = useState(0);

  const [globalBurnSignal, setGlobalBurnSignal] = useState(0);
  const [burnDirection, setBurnDirection] = useState<'top' | 'bottom'>('top');
  const [resetSignal, setResetSignal] = useState(0);
  const [burnedIds, setBurnedIds] = useState<Set<string>>(() => new Set());
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [isBurningAll, setIsBurningAll] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const allBurned = burnedIds.size >= TOTAL_BURNABLE_BLOCKS.length;

  const handleHoverBurnControl = useCallback((hot: boolean) => {
    notifyLighterHover({ hot });
  }, []);

  // Double-click anywhere to ignite/extinguish the lighter torch with Zippo audio
  useEffect(() => {
    const onDblClick = () => {
      if (allBurned || !lighterEnabled) return;
      window.getSelection()?.removeAllRanges();
      setTorchActive((prev) => {
        const next = !prev;
        if (next) {
          playLighterIgniteSound();
        } else {
          playLighterCloseSound();
        }
        return next;
      });
    };

    window.addEventListener('dblclick', onDblClick);
    return () => window.removeEventListener('dblclick', onDblClick);
  }, [allBurned, lighterEnabled]);

  useEffect(() => {
    if (!allBurned) {
      setShowRestorePrompt(false);
      return;
    }
    setTorchActive(false);
    const timer = window.setTimeout(() => {
      setShowRestorePrompt(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [allBurned]);

  const handleBurnComplete = useCallback((id: string) => {
    setBurnedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleBurnAll = (direction: 'top' | 'bottom' = 'top') => {
    if (isBurningAll || allBurned) return;
    playLighterIgniteSound();
    setTorchActive(false);
    setBurnDirection(direction);
    setIsBurningAll(true);
    setCigaretteLit(true);
    setClearScorchSignal((s) => s + 1);
    setGlobalBurnSignal((s) => s + 1);
  };

  const handleRestoreAll = () => {
    setIsBurningAll(false);
    setTorchActive(false);
    setShowRestorePrompt(false);
    setBurnedIds(new Set());
    setCigaretteLit(false);
    setClearScorchSignal((s) => s + 1);
    setResetSignal((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard fallback
    }
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((cur) => (cur === key ? null : cur));
    }, 1800);
  };

  const scrollToContact = () => {
    const el = document.getElementById('page-contact');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className={`min-h-screen bg-[#000000] text-[#F0EDE6] relative ${
        lighterEnabled && !allBurned ? 'lighter-cursor-active' : ''
      }`}
    >
      {/* Interactive Lighter Cursor */}
      <LighterCursor
        enabled={lighterEnabled && !allBurned}
        torchActive={torchActive}
      />

      {/* Persistent Spot-Burn & Ash Layer across the page */}
      <ScorchMarksCanvas
        torchActive={torchActive && lighterEnabled && !allBurned && !isBurningAll}
        clearSignal={clearScorchSignal}
        hidden={allBurned || isBurningAll}
        onHasMarksChange={setHasScorchMarks}
      />

      {/* Page 0: Top Navigation Header */}
      <BurnableSection
        id="site-header"
        globalBurnSignal={globalBurnSignal}
        globalBurnDelayMs={burnDirection === 'top' ? 140 : 1200}
        resetSignal={resetSignal}
        onBurnComplete={handleBurnComplete}
        showSectionBurnButton={false}
        preserveSpaceWhenBurned={!allBurned}
      >
        <SiteHeader onContactClick={scrollToContact} />
      </BurnableSection>

      {/* Main Street Editorial Pages */}
      <main className={allBurned ? 'hidden' : 'block'}>
        {/* Page 1: Urban Asphalt Hero & Living Cigarette Portrait */}
        <BurnableSection
          id="page-hero"
          label="Главную"
          theme="dark"
          globalBurnSignal={globalBurnSignal}
          globalBurnDelayMs={burnDirection === 'top' ? 0 : 1050}
          resetSignal={resetSignal}
          onBurnComplete={handleBurnComplete}
          onHoverBurnControl={handleHoverBurnControl}
          className="bg-[#181816] concrete-grain border-b border-[#F0EDE6]/15"
        >
          <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-9 sm:pt-12 pb-10 sm:pb-14 lg:pt-16 lg:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
            <div className="relative z-10 lg:col-span-6 space-y-7">
              <div className="flex items-center gap-3 font-mono text-xs tracking-wide text-[#A8A49B]">
                <span>20 лет</span>
                <span aria-hidden="true">/</span>
                <span>Веб-дизайн</span>
                <span aria-hidden="true">/</span>
                <span>Разработка сайтов</span>
              </div>

              <h1 className="font-display text-[clamp(2.35rem,8vw,4.75rem)] leading-[0.95] font-bold uppercase tracking-tight text-[#F3F0EA] text-balance">
                Захар — делаю сайты с характером
              </h1>

              <p className="text-base leading-relaxed text-[#C8C4BC] max-w-[52ch]">
                Занимаюсь разработкой и дизайном сайтов. Собираю проекты с
                нуля: от сетки и типографики в Figma до живого кода и уличных
                деталей вроде этой зажигалки.
              </p>

              {/* Street Poster CTA Cluster */}
              <div className="pt-1 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleBurnAll('top')}
                  onMouseEnter={() => handleHoverBurnControl(true)}
                  onMouseLeave={() => handleHoverBurnControl(false)}
                  disabled={isBurningAll}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold bg-[#FF5A1F] text-[#141413] hover:bg-[#FF7340] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 shadow-[4px_4px_0px_#F0EDE6] focus-visible:outline-2 focus-visible:outline-[#F0EDE6] focus-visible:outline-offset-2"
                >
                  <Flame className="w-4 h-4" />
                  <span>Сжечь все страницы</span>
                </button>

                <a
                  href="#page-stack"
                  className="px-5 py-3.5 text-sm font-medium text-[#F0EDE6] hover:bg-[#F0EDE6] hover:text-[#181816] border border-[#F0EDE6]/35 transition-colors whitespace-nowrap shrink-0"
                >
                  Что использую
                </a>
              </div>

              {/* Quiet interaction controls */}
              <div className="pt-5 border-t border-[#F0EDE6]/14 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-[#A8A49B]">
                <span>
                  {torchActive
                    ? 'Зажигалка горит — води курсором или пальцем по экрану, чтобы оставлять пепел'
                    : 'Нажми «Зажечь», затем проведи пальцем или курсором по экрану'}
                </span>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!lighterEnabled || allBurned) return;
                      setTorchActive((prev) => {
                        const next = !prev;
                        if (next) playLighterIgniteSound();
                        else playLighterCloseSound();
                        return next;
                      });
                    }}
                    className="min-h-10 rounded-sm border border-[#F0EDE6]/25 px-3 py-2 text-xs text-[#F0EDE6] active:bg-[#FF5A1F]/20"
                    aria-pressed={torchActive}
                  >
                    {torchActive ? 'Выключить огонь' : 'Зажечь'}
                  </button>
                  <div className="flex items-center gap-3">
                  {hasScorchMarks && (
                    <button
                      type="button"
                      onClick={() => setClearScorchSignal((s) => s + 1)}
                      className="inline-flex items-center gap-1.5 text-[#FF7A45] hover:text-[#FF9D73] transition-colors whitespace-nowrap"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Стереть пепел</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setLighterEnabled((v) => !v);
                      setTorchActive(false);
                    }}
                    className="text-[#C8C4BC] hover:text-[#FFFFFF] underline underline-offset-4 transition-colors whitespace-nowrap"
                  >
                    {lighterEnabled ? 'Скрыть зажигалку' : 'Включить зажигалку'}
                  </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 lg:col-span-6">
              <CigaretteHeroPhoto
                isLit={cigaretteLit}
                onIgnite={() => setCigaretteLit(true)}
                onExtinguish={() => setCigaretteLit(false)}
              />
            </div>
          </section>

          {/* Street Zine Marquee Strip */}
          <div className="border-t border-[#F0EDE6]/14 bg-[#121211] py-3 overflow-hidden select-none">
            <div className="animate-street-marquee font-mono text-xs tracking-widest text-[#9E9A92]">
              <span className="pr-2">{MARQUEE_TEXT.repeat(3)}</span>
              <span className="pr-2" aria-hidden="true">
                {MARQUEE_TEXT.repeat(3)}
              </span>
            </div>
          </div>
        </BurnableSection>

        {/* Page 2: About Me — Bright Raw Concrete Poster Spread */}
        <BurnableSection
          id="page-about"
          label="Обо мне"
          theme="light"
          globalBurnSignal={globalBurnSignal}
          globalBurnDelayMs={burnDirection === 'top' ? 360 : 780}
          resetSignal={resetSignal}
          onBurnComplete={handleBurnComplete}
          onHoverBurnControl={handleHoverBurnControl}
          className="bg-[#DCD9D2] concrete-grain-light text-[#161615] border-b-2 border-[#161615]"
        >
          <section className="max-w-6xl mx-auto px-6 pt-12 sm:pt-20 pb-10 sm:pb-12 px-4 sm:px-0 grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-10 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="font-mono text-xs tracking-wide text-[#58554E]">
                01. Обо мне
              </p>
              <h2 className="font-display text-4xl lg:text-5xl font-bold uppercase leading-[1.02] tracking-tight text-[#141413] text-balance">
                Не претендую на то, что знаю всё — делаю то, в чём уверен
              </h2>
            </div>

            <div className="lg:col-span-7 space-y-5 text-base leading-relaxed text-[#2C2B28] max-w-[60ch]">
              <p>
                Мне 20 лет. Делаю сайты на стыке дизайна и фронтенда — сам
                придумываю визуал и сам пишу код, поэтому по пути от макета к
                браузеру не теряются отступы, ритм и анимации.
              </p>
              <p>
                Не люблю однотипные скучные шаблоны. Мне важно, чтобы у каждой
                страницы был свой характер, понятная структура и живая фишка,
                которую хочется покрутить.
              </p>
            </div>
          </section>
        </BurnableSection>

        {/* Page 3: What I Use — Raw Asphalt Grid */}
        <BurnableSection
          id="page-stack"
          label="Инструменты"
          theme="dark"
          globalBurnSignal={globalBurnSignal}
          globalBurnDelayMs={burnDirection === 'top' ? 680 : 520}
          resetSignal={resetSignal}
          onBurnComplete={handleBurnComplete}
          onHoverBurnControl={handleHoverBurnControl}
          className="bg-[#1F1F1D] concrete-grain text-[#F0EDE6] border-b border-[#F0EDE6]/15"
        >
          <section className="max-w-6xl mx-auto px-6 pt-12 sm:pt-20 pb-10 sm:pb-12 space-y-7 sm:space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="font-mono text-xs tracking-wide text-[#9E9A92]">
                  02. Что использую для разработки
                </p>
                <h2 className="font-display text-4xl lg:text-5xl font-bold uppercase tracking-tight text-[#F3F0EA]">
                  Инструменты без воды
                </h2>
              </div>
              <p className="text-sm text-[#B8B4AC] max-w-[42ch]">
                Только то, на чём реально собираются современные и быстрые
                сайты — от наброска до публикации.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-[#F0EDE6]/18">
              {STACK_ITEMS.map((item) => (
                <div
                  key={item.index}
                  className="p-5 sm:p-7 border-r border-b border-[#F0EDE6]/18 bg-[#262623] space-y-3"
                >
                  <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#F3F0EA]">
                    {item.index}. {item.title}
                  </h3>
                  <p className="font-mono text-xs text-[#FF6B35]">{item.tools}</p>
                  <p className="text-sm leading-relaxed text-[#C8C4BC]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </BurnableSection>

        {/* Page 4: Visual Approach with Living Duo Photo — Concrete Poster Wall */}
        <BurnableSection
          id="page-approach"
          label="Подход"
          theme="light"
          globalBurnSignal={globalBurnSignal}
          globalBurnDelayMs={burnDirection === 'top' ? 980 : 260}
          resetSignal={resetSignal}
          onBurnComplete={handleBurnComplete}
          onHoverBurnControl={handleHoverBurnControl}
          className="bg-[#D4D0C7] concrete-grain-light text-[#161615] border-b-2 border-[#161615]"
        >
          <section className="max-w-6xl mx-auto px-6 pt-12 sm:pt-20 pb-10 sm:pb-12 px-4 sm:px-0 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
            <div className="lg:col-span-7">
              <ApproachDuoPhoto />
            </div>

            <div className="lg:col-span-5 space-y-6">
              <p className="font-mono text-xs tracking-wide text-[#58554E]">
                03. Как работаю
              </p>
              <h2 className="font-display text-4xl lg:text-5xl font-bold uppercase leading-[1.02] tracking-tight text-[#141413] text-balance">
                Спокойный процесс и рабочий результат
              </h2>

              <div className="space-y-5 pt-2">
                <div className="border-t border-[#141413]/20 pt-4">
                  <p className="text-sm font-bold text-[#141413]">
                    Прямой контакт
                  </p>
                  <p className="mt-1 text-sm text-[#3A3834]">
                    Обсуждаем задачу напрямую без лишней бюрократии и сложных
                    терминов.
                  </p>
                </div>

                <div className="border-t border-[#141413]/20 pt-4">
                  <p className="text-sm font-bold text-[#141413]">
                    Вкус к деталям
                  </p>
                  <p className="mt-1 text-sm text-[#3A3834]">
                    Слежу за тем, как двигаются блоки, читается текст и ощущается
                    интерфейс.
                  </p>
                </div>

                <div className="border-t border-[#141413]/20 pt-4">
                  <p className="text-sm font-bold text-[#141413]">
                    Честные рамки
                  </p>
                  <p className="mt-1 text-sm text-[#3A3834]">
                    Сразу говорю, что сделаю сам, а где лучше не усложнять
                    лишним.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </BurnableSection>

        {/* Page 5: Contacts & Final Burn Trigger */}
        <BurnableSection
          id="page-contact"
          label="Контакты"
          theme="dark"
          globalBurnSignal={globalBurnSignal}
          globalBurnDelayMs={burnDirection === 'top' ? 1280 : 0}
          resetSignal={resetSignal}
          onBurnComplete={handleBurnComplete}
          onHoverBurnControl={handleHoverBurnControl}
          className="bg-[#181816] concrete-grain text-[#F0EDE6]"
        >
          <footer className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 sm:pb-14 space-y-8 sm:space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
              <div className="lg:col-span-7 space-y-4">
                <p className="font-mono text-xs tracking-wide text-[#9E9A92]">
                  04. Контакты
                </p>
                <h2 className="font-display text-4xl lg:text-6xl font-bold uppercase leading-[0.98] tracking-tight text-[#F3F0EA] text-balance">
                  Есть идея для сайта? Пиши
                </h2>
                <p className="text-sm text-[#C8C4BC] max-w-[48ch]">
                  Быстрее всего отвечаю в Telegram. Если хочется финального
                  эффекта — сожги весь сайт кнопкой справа.
                </p>
              </div>

              <div className="lg:col-span-5 flex lg:justify-end">
                <button
                  type="button"
                  onClick={() => handleBurnAll('bottom')}
                  onMouseEnter={() => handleHoverBurnControl(true)}
                  onMouseLeave={() => handleHoverBurnControl(false)}
                  disabled={isBurningAll}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold border border-[#FF5A1F] text-[#FF7A45] hover:bg-[#FF5A1F] hover:text-[#141413] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
                >
                  <Flame className="w-4 h-4" />
                  <span>Сжечь все страницы</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#F0EDE6]/15 pt-8">
              <button
                type="button"
                onClick={() => handleCopy('tg', '@zakhar_web')}
                className="flex items-center justify-between gap-4 p-4 border border-[#F0EDE6]/20 bg-[#222220] hover:border-[#FF5A1F] text-left transition-colors"
              >
                <div>
                  <span className="block font-mono text-xs text-[#9E9A92]">
                    Telegram
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#F3F0EA]">
                    @zakhar_web
                  </span>
                </div>
                {copiedKey === 'tg' ? (
                  <Check className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-[#9E9A92] shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy('email', 'zakhar.design@mail.ru')}
                className="flex items-center justify-between gap-4 p-4 border border-[#F0EDE6]/20 bg-[#222220] hover:border-[#FF5A1F] text-left transition-colors"
              >
                <div>
                  <span className="block font-mono text-xs text-[#9E9A92]">
                    Почта
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#F3F0EA]">
                    zakhar.design@mail.ru
                  </span>
                </div>
                {copiedKey === 'email' ? (
                  <Check className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-[#9E9A92] shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy('gh', 'github.com/zakhar-dev')}
                className="flex items-center justify-between gap-4 p-4 border border-[#F0EDE6]/20 bg-[#222220] hover:border-[#FF5A1F] text-left transition-colors"
              >
                <div>
                  <span className="block font-mono text-xs text-[#9E9A92]">
                    GitHub
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#F3F0EA]">
                    github.com/zakhar-dev
                  </span>
                </div>
                {copiedKey === 'gh' ? (
                  <Check className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-[#9E9A92] shrink-0" />
                )}
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-[#8A867E]">
              <span>Захар · 20 лет</span>
              <span>Сделано с зажигалкой и чистым кодом</span>
            </div>
          </footer>
        </BurnableSection>
      </main>

      {/* Pure pitch-black aftermath when all pages are burned */}
      {allBurned && (
        <div className="fixed inset-0 bg-[#000000] z-50 flex items-center justify-center">
          <button
            type="button"
            onClick={handleRestoreAll}
            className={`inline-flex items-center gap-2 text-xs tracking-wide text-[#5C5953] hover:text-[#F0EDE6] transition-all duration-700 px-5 py-2.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#FF5A1F] ${
              showRestorePrompt
                ? 'opacity-70 hover:opacity-100 translate-y-0'
                : 'opacity-0 pointer-events-none translate-y-2'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Вернуть сайт</span>
          </button>
        </div>
      )}
    </div>
  );
}
