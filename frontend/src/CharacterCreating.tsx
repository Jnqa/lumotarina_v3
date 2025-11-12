import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CharacterCreating.css';

type Option = {
	text: string;
	next?: string | null;
	description?: string;
	abilities?: Array<Record<string, number>> | Record<string, number>;
	level?: number;
	enabled?: boolean;
	class?: string;
};

type Question = {
	text: string;
	type?: string;
	options?: Option[];
	next?: string;
};

type Template2 = {
	questions: Record<string, Question>;
	start: string;
};

export default function CharacterCreating() {
	const [template, setTemplate] = useState<Template2 | null>(null);
	const [currentId, setCurrentId] = useState<string | null>(null);
	const [selected, setSelected] = useState<Option | null>(null);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [abilities, setAbilities] = useState<Record<string, number>>({});
	const [foundClasses, setFoundClasses] = useState<string[]>([]);
	const [cityLevel, setCityLevel] = useState<number | null>(null);
	const [classOptions, setClassOptions] = useState<Option[] | null>(null);
	const [images, setImages] = useState<string[] | null>(null);
	const [imagesLoading, setImagesLoading] = useState(false);
	const [imagesError, setImagesError] = useState<string | null>(null);
	const [viewer, setViewer] = useState<string | null>(null);
	// navigation state will handle class selection page; no local mode needed
	const nav = useNavigate();

	useEffect(() => {
		fetch('/templates/character_template.json')
			.then((r) => r.ok ? r.json() : null)
			.then((j) => {
				if (j && j.questions && j.start) {
					setTemplate(j as Template2);
					setCurrentId(j.start);
				} else if (j && Array.isArray((j as any).stages)) {
					// backward compatibility: convert stages to questions
					const q: Record<string, Question> = {};
					(j as any).stages.forEach((s: any, idx: number) => {
						q[s.id || `step${idx}`] = { text: s.label || '', options: (s.options || []).map((o: any) => ({ text: String(o) })) };
					});
					setTemplate({ questions: q, start: Object.keys(q)[0] });
					setCurrentId(Object.keys(q)[0]);
				} else {
					setTemplate(null);
				}
			})
			.catch(() => setTemplate(null));
	}, []);

	useEffect(() => {
		if (!template || !currentId) return;
		const q = template.questions[currentId];
		if (q && q.type === 'class_choice') {
			fetch('/templates/classes.json').then(r => r.ok ? r.json() : null).then((j) => {
				if (!j || !j.classes) return setClassOptions([]);
				const opts: Option[] = [];
				j.classes.forEach((c: any) => {
					(c.subclasses || []).forEach((sc: any) => {
						opts.push({ text: sc.name, class: sc.id, description: sc.description });
					});
				});
				setClassOptions(opts);
			}).catch(() => setClassOptions([]));
		} else {
			setClassOptions(null);
		}
	}, [template, currentId]);

	useEffect(() => {
		if (currentId !== 'city') {
			setImages(null);
			setImagesError(null);
			setImagesLoading(false);
		}
	}, [currentId]);

// class loading moved to the dedicated class selection page component

	// try to load images for a city name from multiple lore categories (poi, buildings, characters, clippings)
	async function tryLoadCityImages(name: string) {
		setImagesLoading(true);
		setImagesError(null);
		setImages(null);
		const cats = ['poi', 'buildings', 'characters', 'clippings', 'timeline'];
		const base = name.replace(/\.md$/i, '');
		let tried: string[] = [];
		for (const c of cats) {
			const encBase = encodeURIComponent(base);
			const url = `/lore/${c}/${encBase}/images.json`;
			tried.push(url);
			try {
				const r = await fetch(url);
				if (!r.ok) continue;
				const arr = await r.json();
				if (Array.isArray(arr) && arr.length > 0) {
					const paths = arr.map((n: string) => `/lore/${c}/${encBase}/${n}`);
					setImages(paths);
					setImagesLoading(false);
					return;
				}
				// if images.json exists but empty
				if (Array.isArray(arr) && arr.length === 0) {
					setImages([]);
					setImagesError('images.json найден, но он пуст');
					setImagesLoading(false);
					return;
				}
			} catch (e: any) {
				setImagesError(`Ошибка при загрузке ${url}: ${e && e.message ? e.message : String(e)}`);
				// continue to try other categories
			}
		}
		setImagesLoading(false);
		if (!images && !imagesError) {
			setImagesError(`Изображения не найдены. Пробовал: ${tried.join(', ')}`);
		}
	}

	if (!template || !currentId) return <div className="char-root">Загрузка шаблона...</div>;

	const questions = template.questions;
	const currentQ = questions[currentId];
	if (!currentQ) return <div className="char-root">Шаблон некорректен: вопрос не найден ({currentId})</div>;

	const opts = currentQ.type === 'class_choice' ? (classOptions || []) : (currentQ.options || []);

	function getLevelInfo(level?: number | null) {
		switch (level) {
			case 1: return { label: 'Захолустье', color: '#4b4b4b', class: 'level-1' };
			case 2: return { label: 'Поселение', color: '#256e3b', class: 'level-2' };
			case 3: return { label: 'Центр ремесла', color: '#1f5fa0', class: 'level-3' };
			case 4: return { label: 'Узел влияния', color: '#5b2a7a', class: 'level-4' };
			case 5: return { label: 'Развитый город', color: '#b8860b', class: 'level-5' };
			default: return { label: '', color: '#333', class: '' };
		}
	}

	async function handleNext() {
		if (!selected) return;
		// merge answer (local copy to pass to the next page)
		const localAnswers = { ...answers, [currentId as string]: selected.text };
		setAnswers(localAnswers);
		// if current question is city, try load images immediately
		if (currentId === 'city') {
			tryLoadCityImages(selected.text);
		}
		// merge abilities (make a local merged copy so navigation receives current values)
		let mergedAbilitiesLocal: Record<string, number> = { ...abilities };
		if (selected.abilities) {
			const arr = Array.isArray(selected.abilities) ? selected.abilities : [selected.abilities];
			arr.forEach((obj) => {
				Object.entries(obj).forEach(([k, v]) => {
					mergedAbilitiesLocal[k] = (mergedAbilitiesLocal[k] || 0) + Number(v || 0);
				});
			});
			setAbilities(mergedAbilitiesLocal);
		}
		// city level
		const mergedCityLevel = selected.level ?? cityLevel;
		if (selected.level) setCityLevel(selected.level);

		// collect any class ID present on the selected option
		if (selected.class) {
			setFoundClasses((prev) => {
				if (prev.includes(selected.class as string)) return prev;
				return [...prev, selected.class as string];
			});
		}

		const nextId = selected.next ?? currentQ.next ?? null;
		setSelected(null);
		if (nextId) {
			setCurrentId(nextId);
		} else {
			// finished questions — persist preview to localStorage and navigate to class selection page
			const preview = { answers: localAnswers, abilities: mergedAbilitiesLocal, cityLevel: mergedCityLevel, foundClasses: selected.class ? [...foundClasses, selected.class] : foundClasses };
			try {
				localStorage.setItem('char_preview', JSON.stringify(preview));
			} catch (e) {
				// ignore storage errors
			}
			nav('/character/class', { state: preview });
		}
	}

	function handleChoose(opt: Option) {
		setSelected(opt);
		// if we're on the city question, try to load images for the selected city immediately
		if (currentId === 'city' && opt && opt.text) {
			tryLoadCityImages(opt.text);
		} else {
			// clear images when selecting non-city options
			setImages(null);
			setImagesError(null);
		}
	}


	

	function prev() {
		// simple fallback: go back to profile
		nav('/profile');
	}

    

    

    

	return (
		<div className="char-root">
			<button className="char-back" onClick={() => nav('/')}>← Home</button>
			<h2>Создание персонажа</h2>
			<div className="char-progress">Вопрос: {currentQ.text}</div>

			<div className="char-stage">
				<h3>{currentQ.text}</h3>
				{/* image slot moved into description panel below */}
				<div className="char-options">
					{opts.length === 0 && <div className="char-note">Нет доступных опций</div>}
					{opts.map((o) => (
						<button
							key={o.text}
							className={`char-opt ${selected && selected.text === o.text ? 'selected' : ''}`}
							onClick={() => handleChoose(o as Option)}
						>
							{o.text}
						</button>
					))}
				</div>

				{selected && (
					<div className="char-city-panel">
						<div className="city-header">
							<strong>{selected.text}</strong>
							{selected.level && (
								<span className={`level-badge ${getLevelInfo(selected.level).class}`} style={{ background: getLevelInfo(selected.level).color }}>{getLevelInfo(selected.level).label}</span>
							)}
						</div>
						<div className="city-body">
							<div className="city-gallery-and-desc">
								{/* {selected.level && (
									<div className="city-wealth">
										<div className="wealth-bar" style={{ borderColor: getLevelInfo(selected.level).color }}>
											<div className="wealth-fill" style={{ width: `${(selected.level/5)*100}%`, background: getLevelInfo(selected.level).color }} />
										</div>
									</div>
								)} */}
								{selected && imagesLoading && <div className="char-image-hint">Загрузка изображений...</div>}
								{selected && !imagesLoading && images && images.length > 0 && (
									<div className="char-city-gallery">
										{images.map((src) => (
											<img key={src} src={src} className="lore-thumb" alt="preview" onClick={() => setViewer(src)} />
										))}
									</div>
								)}
								{selected && !imagesLoading && (!images || images.length === 0) && (
									<div className="char-image-hint">{imagesError || 'Изображения не найдены'}</div>
								)}
							</div>
							<div className="city-desc">{selected.description}</div>
						</div>
					</div>
				)}
			</div>

			<div className="char-controls">
				<button onClick={prev}>Назад</button>
				<button onClick={handleNext} disabled={!selected}>{'Далее'}</button>
			</div>

			{viewer && (
				<div className="lore-viewer" onClick={() => setViewer(null)}>
					<img src={viewer} alt="full" />
				</div>
			)}

			<aside className="char-summary">
				<h4>Предварительный просмотр</h4>
				<pre>{JSON.stringify({ answers, abilities, cityLevel }, null, 2)}</pre>
			</aside>
		</div>
	);
}
