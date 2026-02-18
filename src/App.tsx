import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { 
  CheckCircle2, Plus, ArrowLeft, Calendar, 
  Clock, Trash2, ChevronRight, BarChart3, List, Flame, Zap, Trophy, X, GripVertical, Timer, Settings, Bell, PartyPopper
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import confetti from 'canvas-confetti';

// --- 工具與樣式 ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  return `${h}小時${m > 0 ? ` ${m}分` : ''}`;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- 獨立的拖曳組件 ---
const SortableTaskItem = ({ task, deleteTask, toggleTaskToday, completeTask }) => {
  const controls = useDragControls(); 

  const colorStyles = {
    big: "bg-orange-500 shadow-orange-500/30",
    medium: "bg-blue-600 shadow-blue-600/30",
    small: "bg-emerald-500 shadow-emerald-500/30",
    quick: "bg-purple-600 shadow-purple-600/30"
  };

  return (
    <Reorder.Item 
      value={task} 
      dragListener={false} 
      dragControls={controls} 
      className="relative touch-action-none list-none" 
    >
      <div className={cn(
          "mb-3 p-4 rounded-3xl shadow-lg relative overflow-hidden group border border-white/10 select-none flex items-center gap-3",
          colorStyles[task.size] || "bg-zinc-800"
        )}
      >
        <div className="flex-1 relative z-10 flex flex-col items-start justify-center gap-1 pl-2">
          <h3 className="font-bold text-white text-lg drop-shadow-md text-left leading-tight">{task.title}</h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/80 bg-black/20 px-3 py-1 rounded-full uppercase tracking-wider">
            <span>{task.size === 'quick' ? 'Quick' : task.size}</span>
            <span>•</span>
            <span>{task.size === 'big' ? '90m' : task.size === 'medium' ? '30m' : task.size === 'small' ? '10m' : '2m'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleTaskToday(task.id); }} 
              className={cn("p-2 rounded-full text-white hover:text-black transition-colors", task.isToday ? "bg-green-500" : "bg-white/20 hover:bg-white")}
            >
              <Plus size={20}/>
            </button>
            <div 
              onPointerDown={(e) => controls.start(e)}
              className="p-2 rounded-full text-white/50 hover:text-white cursor-grab active:cursor-grabbing bg-black/20 touch-none"
            >
              <GripVertical size={20}/>
            </div>
            {/* 專案視圖也可以直接完成任務 */}
            <button 
              onClick={(e) => { e.stopPropagation(); completeTask(task.id); }} 
              className="bg-black/20 p-2 rounded-full hover:bg-green-500 text-white"
            >
              <CheckCircle2 size={20}/>
            </button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      </div>
    </Reorder.Item>
  );
};

export default function App() {
  const [view, setView] = useState('home');
  const [activeProject, setActiveProject] = useState(null);
  const [completedProjectInfo, setCompletedProjectInfo] = useState(null); // 存儲剛完成的專案資訊
  
  // --- 資料狀態 ---
  const [projects, setProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('my-135-projects') || '[]'); } catch (e) { return []; }
  });

  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('my-135-tasks') || '[]'); } catch (e) { return []; }
  });

  const [streak, setStreak] = useState(() => {
    try { return parseInt(localStorage.getItem('my-135-streak') || '0'); } catch (e) { return 0; }
  });

  const [lastActive, setLastActive] = useState(() => {
    return localStorage.getItem('my-135-lastActive') || new Date().toDateString();
  });

  const [settings, setSettings] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('my-135-settings') || '{"resetTime":"23:00", "enableNotify":false}'); 
    } catch (e) { return { resetTime: "23:00", enableNotify: false }; }
  });

  // --- 持久化 ---
  useEffect(() => {
    localStorage.setItem('my-135-projects', JSON.stringify(projects));
    localStorage.setItem('my-135-tasks', JSON.stringify(tasks));
    localStorage.setItem('my-135-streak', streak.toString());
    localStorage.setItem('my-135-lastActive', lastActive);
    localStorage.setItem('my-135-settings', JSON.stringify(settings));
  }, [projects, tasks, streak, lastActive, settings]);

  useEffect(() => {
    const today = new Date().toDateString();
    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastActive === yesterday.toDateString()) {
        setStreak(s => s + 1);
      }
      setLastActive(today);
    }

    const checkTime = () => {
      const now = new Date();
      const [resetHour, resetMinute] = settings.resetTime.split(':').map(Number);
      
      if (now.getHours() === resetHour && now.getMinutes() === resetMinute) {
         setTasks(prev => prev.map(t => (t.isToday && !t.completed) ? { ...t, isToday: false } : t));
      }

      if (settings.enableNotify) {
        let notifyHour = resetHour;
        let notifyMinute = resetMinute - 30;
        if (notifyMinute < 0) { notifyMinute += 60; notifyHour -= 1; }
        if (notifyHour < 0) notifyHour += 24;

        if (now.getHours() === notifyHour && now.getMinutes() === notifyMinute) {
          const hasPending = tasks.some(t => t.isToday && !t.completed);
          if (hasPending && Notification.permission === "granted") {
             new Notification("1-3-5 Focus", { body: "還剩 30 分鐘任務將被重置！" });
          }
        }
      }
    };
    const interval = setInterval(checkTime, 60000); 
    return () => clearInterval(interval);
  }, [settings, tasks]);

  const requestNotification = async () => {
    if (!("Notification" in window)) { alert("此瀏覽器不支援通知"); return; }
    const permission = await Notification.requestPermission();
    if (permission === "granted") setSettings({ ...settings, enableNotify: true });
    else { setSettings({ ...settings, enableNotify: false }); alert("請允許通知權限"); }
  };

  // --- 邏輯計算 ---
  const getProjectStats = (projectId) => {
    // 注意：這裡我們需要計算「所有」任務（包含已完成的）來顯示總投入時間
    const pTasks = tasks.filter(t => t.projectId === projectId);
    const totalMinutes = pTasks.reduce((acc, t) => {
      if (t.size === 'big') return acc + 90;
      if (t.size === 'medium') return acc + 30;
      return acc + 10;
    }, 0);
    const remaining = pTasks.filter(t => !t.completed).length;
    return { totalMinutes, count: pTasks.length, remaining };
  };

  const getProjectUrgency = (project) => {
    const pTasks = tasks.filter(t => t.projectId === project.id && !t.completed);
    const totalMinutes = pTasks.reduce((acc, t) => {
      if (t.size === 'big') return acc + 90;
      if (t.size === 'medium') return acc + 30;
      return acc + 10;
    }, 0);
    if (totalMinutes === 0) return 0;
    const deadline = new Date(project.deadline);
    const today = new Date();
    const diffDays = Math.max(1, Math.ceil((deadline - today) / (86400000))); 
    return totalMinutes / diffDays; 
  };

  // --- 特效 ---
  const triggerConfetti = () => {
    try {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700', '#FFA500', '#00FF00', '#00BFFF'] });
      }
    } catch (e) { console.warn(e); }
  };

  // 豪華煙火 (專案完成用)
  const triggerFireworks = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      // @ts-ignore
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      // @ts-ignore
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  // --- 動作 ---
  const addProject = (name, goal, deadline) => {
    const newProject = { id: generateId(), name, goal, deadline, createdAt: new Date(), isArchived: false };
    setProjects([...projects, newProject]);
    setView('project-detail');
    setActiveProject(newProject);
  };

  // 刪除專案 (如果 keepTasks 為 true，則只是封存專案，保留任務紀錄)
  const deleteProject = (id, archiveOnly = false) => {
    if (archiveOnly) {
       setProjects(projects.map(p => p.id === id ? { ...p, isArchived: true } : p));
       if (activeProject?.id === id) setView('projects');
    } else {
       if(confirm('確定要完全刪除此專案嗎？(任務紀錄將一併消失)')) {
         setProjects(projects.filter(p => p.id !== id));
         setTasks(tasks.filter(t => t.projectId !== id));
         if (activeProject?.id === id) setView('projects');
       }
    }
  };

  const addTask = (projectId, title, size) => {
    setTasks([...tasks, {
      id: generateId(), projectId, title, size,
      completed: false, isToday: false, completedAt: null, isQuick: false,
      projectName: projects.find(p => p.id === projectId)?.name // Snapshot project name for history
    }]);
  };

  const addQuickTask = (title) => {
    setTasks([...tasks, {
      id: generateId(), projectId: 'quick-list', title, size: 'quick',
      completed: false, isToday: false, completedAt: null, isQuick: true,
      projectName: 'Quick Task'
    }]);
  };

  const completeTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // 1. 基本特效
    triggerConfetti();

    // 2. 更新任務狀態
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: true, completedAt: new Date(), isToday: false } : t);
    setTasks(updatedTasks);

    // 3. 檢查專案是否全部完成 (若是專案任務)
    if (!task.isQuick) {
       const projectTasks = updatedTasks.filter(t => t.projectId === task.projectId);
       const hasRemaining = projectTasks.some(t => !t.completed);
       
       // 如果沒有剩餘任務，且該專案確實有任務 (避免空專案誤判)
       if (!hasRemaining && projectTasks.length > 0) {
          const proj = projects.find(p => p.id === task.projectId);
          if (proj && !proj.isArchived) {
             // 觸發專案完成流程
             setTimeout(() => {
                triggerFireworks();
                const stats = getProjectStats(task.projectId);
                setCompletedProjectInfo({
                   id: proj.id,
                   name: proj.name,
                   duration: stats.totalMinutes
                });
             }, 800); // 稍微延遲讓用戶先看到任務勾選動畫
          }
       }
    }
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const toggleTaskToday = (taskId) => {
    setTasks(prevTasks => prevTasks.map(t => {
      if (t.id !== taskId) return t;
      if (!t.isToday) {
        const count = prevTasks.filter(x => x.isToday && !x.completed && x.size === t.size).length;
        const limits = { big: 1, medium: 3, small: 5 };
        if (count >= limits[t.size]) {
          alert(`今天的 ${t.size} 任務槽已滿！`);
          return t;
        }
        return { ...t, isToday: true };
      } else {
        return { ...t, isToday: false };
      }
    }));
  };

  const handleReorder = (newProjectTasksOrder) => {
    const currentProjectVisibleIds = newProjectTasksOrder.map(t => t.id);
    const otherTasks = tasks.filter(t => !currentProjectVisibleIds.includes(t.id));
    setTasks([...newProjectTasksOrder, ...otherTasks]);
  };

  // --- UI Components ---
  
  const HomeTaskItem = ({ task }) => {
    const colorStyles = {
      big: "bg-orange-500 shadow-orange-500/30",
      medium: "bg-blue-600 shadow-blue-600/30",
      small: "bg-emerald-500 shadow-emerald-500/30"
    };

    return (
      <div className={cn("mb-3 p-4 rounded-3xl shadow-lg relative overflow-hidden group border border-white/10 select-none", colorStyles[task.size] || "bg-zinc-800")}>
        <div className="relative z-10 flex flex-col items-center justify-center text-center gap-2">
          <h3 className="font-bold text-white text-lg drop-shadow-md">{task.title}</h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/80 bg-black/20 px-3 py-1 rounded-full uppercase tracking-wider">
            <span>{task.size}</span>
            <span>•</span>
            <span>{task.projectName || projects.find(p => p.id === task.projectId)?.name}</span>
          </div>
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
           <button onClick={(e) => { e.stopPropagation(); toggleTaskToday(task.id); }} className="bg-black/40 p-2 rounded-full hover:bg-red-500 text-white/80 hover:text-white backdrop-blur-md"><X size={18} /></button>
           <button onClick={(e) => { e.stopPropagation(); completeTask(task.id); }} className="bg-white text-black p-2 rounded-full shadow-xl hover:scale-110 transition-transform"><CheckCircle2 size={20} /></button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      </div>
    );
  };

  const QuickTaskItem = ({ task }) => (
    <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} className="mb-3 p-4 rounded-2xl bg-purple-900/40 border border-purple-500/30 flex justify-between items-center group">
       <div className="flex items-center gap-3">
          <button onClick={() => completeTask(task.id)} className="w-6 h-6 rounded-full border-2 border-purple-400 hover:bg-purple-400 transition-colors" />
          <span className="text-white font-medium">{task.title}</span>
       </div>
       <button onClick={() => deleteTask(task.id)} className="text-white/30 hover:text-red-400 p-2"><Trash2 size={18}/></button>
    </motion.div>
  );

  // --- Views ---

  const HomeView = () => {
    const todayTasks = tasks.filter(t => t.isToday && !t.completed);
    const totalSlots = 1 + 3 + 5;
    const usedSlots = todayTasks.length;
    const energyPercent = Math.round((usedSlots / totalSlots) * 100);

    const SlotSection = ({ size, label, limit, color }) => {
      const slotTasks = todayTasks.filter(t => t.size === size);
      return (
        <div className="mb-6">
           <div className={`text-center text-xs font-black tracking-[0.2em] mb-3 uppercase ${color}`}> {label} ({slotTasks.length}/{limit}) </div>
           <div className="space-y-2 min-h-[80px] p-2 rounded-3xl bg-white/5 border border-white/5 flex flex-col justify-center">
              <AnimatePresence>
                {slotTasks.map(t => (
                   <motion.div key={t.id} layoutId={t.id} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                      <HomeTaskItem task={t} />
                   </motion.div>
                ))}
              </AnimatePresence>
              {slotTasks.length === 0 && <div className="text-center text-white/10 text-xs py-4 font-bold tracking-wider">等待指派...</div>}
           </div>
        </div>
      );
    };

    return (
      <div className="p-6 pb-24 min-h-screen bg-[#121212] text-white">
        <header className="flex justify-between items-start mb-8 pt-2">
          <div className="flex gap-2">
             <button onClick={() => setView('projects')} className="p-3 bg-zinc-800 rounded-2xl hover:bg-zinc-700"><List className="text-white" /></button>
             <button onClick={() => setView('quick-tasks')} className="p-3 bg-purple-900/50 rounded-2xl hover:bg-purple-800 border border-purple-500/30"><Zap className="text-purple-400" /></button>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-orange-500 font-black text-2xl"><Flame fill="currentColor" /> {streak}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Day Streak</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('settings')} className="p-3 bg-zinc-800 rounded-2xl hover:bg-zinc-700"><Settings className="text-white" /></button>
            <button onClick={() => setView('completed')} className="p-3 bg-zinc-800 rounded-2xl hover:bg-zinc-700"><Trophy className="text-yellow-500" /></button>
          </div>
        </header>

        <div className="mb-8 bg-zinc-900 p-4 rounded-3xl border border-white/5 relative overflow-hidden">
           <div className="flex justify-between text-xs font-bold text-white/50 mb-2 z-10 relative">
             <span className="flex items-center gap-1"><Zap size={12}/> DAILY ENERGY</span>
             <span>{energyPercent}%</span>
           </div>
           <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
             <motion.div initial={{ width: 0 }} animate={{ width: `${energyPercent}%` }} className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500" />
           </div>
        </div>
        <SlotSection size="big" label="Core Mission" limit={1} color="text-orange-500" />
        <SlotSection size="medium" label="Key Objectives" limit={3} color="text-blue-500" />
        <SlotSection size="small" label="Quick Wins" limit={5} color="text-emerald-500" />
      </div>
    );
  };

  const QuickTasksView = () => {
    const quickList = tasks.filter(t => t.isQuick && !t.completed);
    const [quickTitle, setQuickTitle] = useState('');
    return (
      <div className="p-6 min-h-screen bg-[#121212]">
         <header className="flex items-center gap-4 mb-8 pt-4">
          <button onClick={() => setView('home')} className="p-3 bg-zinc-800 rounded-2xl"><ArrowLeft className="text-white" /></button>
          <h1 className="text-xl font-black text-white tracking-widest uppercase text-purple-400">Quick Actions</h1>
        </header>
        <div className="bg-purple-900/20 p-4 rounded-3xl border border-purple-500/30 mb-8">
           <div className="flex gap-2">
              <input value={quickTitle} onChange={e => setQuickTitle(e.target.value)} placeholder="輸入小任務 (如: 剪指甲)..." className="flex-1 bg-black/50 text-white px-4 py-3 rounded-2xl outline-none placeholder:text-purple-300/30" onKeyDown={e => e.key === 'Enter' && quickTitle && (addQuickTask(quickTitle), setQuickTitle(''))} autoFocus />
              <button onClick={() => { if(quickTitle) { addQuickTask(quickTitle); setQuickTitle(''); }}} className="bg-purple-500 text-white px-4 rounded-2xl hover:bg-purple-400"><Plus strokeWidth={3} /></button>
           </div>
        </div>
        <div className="space-y-2">
           {quickList.map(t => <QuickTaskItem key={t.id} task={t} />)}
           {quickList.length === 0 && <div className="text-center text-purple-900/40 font-bold text-4xl mt-20">NO TASKS</div>}
        </div>
      </div>
    );
  };

  const SettingsView = () => {
    return (
      <div className="p-6 min-h-screen bg-[#121212]">
         <header className="flex items-center gap-4 mb-8 pt-4">
          <button onClick={() => setView('home')} className="p-3 bg-zinc-800 rounded-2xl"><ArrowLeft className="text-white" /></button>
          <h1 className="text-xl font-black text-white tracking-widest uppercase">Settings</h1>
        </header>
        <div className="space-y-6">
           <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Clock size={20}/> 每日重置時間</h3>
              <input type="time" value={settings.resetTime} onChange={(e) => setSettings({...settings, resetTime: e.target.value})} className="bg-black text-white text-2xl p-4 rounded-xl w-full text-center outline-none border border-white/20 focus:border-blue-500" />
           </div>
           <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Bell size={20}/> 任務提醒</h3>
              {settings.enableNotify ? (<button onClick={() => setSettings({...settings, enableNotify: false})} className="w-full py-4 bg-green-500/20 text-green-500 border border-green-500 rounded-xl font-bold">已啟用通知</button>) : (<button onClick={requestNotification} className="w-full py-4 bg-white/5 text-white border border-white/20 rounded-xl font-bold hover:bg-white/10">點擊啟用通知權限</button>)}
           </div>
        </div>
      </div>
    );
  };

  const ProjectsView = () => {
    const [isAdding, setIsAdding] = useState(false);
    const [newProj, setNewProj] = useState({ name: '', goal: '', deadline: '' });
    // 只顯示未封存的專案
    const activeProjects = projects.filter(p => !p.isArchived);
    const sorted = [...activeProjects].sort((a, b) => getProjectUrgency(b) - getProjectUrgency(a));

    const getHeatStyle = (urgency) => {
       if (urgency > 5) return "from-red-600 to-rose-900 border-red-500/50 shadow-red-900/20"; 
       if (urgency > 2) return "from-orange-500 to-amber-800 border-orange-500/50 shadow-orange-900/20"; 
       return "from-blue-600 to-indigo-900 border-blue-500/50 shadow-blue-900/20"; 
    };

    return (
      <div className="p-6 pb-28 min-h-screen bg-[#121212]">
        <header className="flex items-center justify-center relative mb-8 pt-4">
          <button onClick={() => setView('home')} className="absolute left-0 p-3 bg-zinc-800 rounded-2xl"><ArrowLeft className="text-white" /></button>
          <h1 className="text-xl font-black text-white tracking-widest uppercase">Projects</h1>
        </header>

        {isAdding && (
          <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} className="bg-zinc-900 p-6 rounded-3xl mb-6 border border-zinc-700 text-center">
            <h3 className="text-white font-bold mb-4">New Project</h3>
            <input placeholder="名稱" className="w-full bg-black p-3 rounded-xl text-white text-center mb-3 outline-none border border-white/10 focus:border-blue-500" onChange={e => setNewProj({...newProj, name: e.target.value})} />
            <input placeholder="目標" className="w-full bg-black p-3 rounded-xl text-white text-center mb-3 outline-none border border-white/10 focus:border-blue-500" onChange={e => setNewProj({...newProj, goal: e.target.value})} />
            <input type="date" className="w-full bg-black p-3 rounded-xl text-white text-center mb-4 outline-none border border-white/10" onChange={e => setNewProj({...newProj, deadline: e.target.value})} />
            <button onClick={() => { if(newProj.name && newProj.deadline) { addProject(newProj.name, newProj.goal, newProj.deadline); setIsAdding(false); }}} className="w-full bg-white text-black p-3 rounded-xl font-bold hover:scale-105 transition-transform">Create</button>
          </motion.div>
        )}

        <div className="space-y-4">
          {sorted.map(p => {
            const urgency = getProjectUrgency(p);
            const stats = getProjectStats(p.id);
            const daysLeft = Math.ceil((new Date(p.deadline) - new Date()) / (86400000));
            return (
              <motion.div key={p.id} layout onClick={() => { setActiveProject(p); setView('project-detail'); }} className={cn("p-6 rounded-3xl cursor-pointer bg-gradient-to-br border shadow-xl group text-center relative overflow-hidden", getHeatStyle(urgency))}>
                <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md">{p.name}</h2>
                <p className="text-sm text-white/90 mb-4 font-medium">{p.goal}</p>
                <div className="flex justify-center gap-2">
                   <div className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-mono flex items-center gap-1"><Clock size={10}/> {formatDuration(stats.totalMinutes)}</div>
                   <div className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-mono flex items-center gap-1"><Calendar size={10}/> {daysLeft} Days</div>
                </div>
              </motion.div>
            );
          })}
          {sorted.length === 0 && !isAdding && <div className="text-center text-white/20 mt-20 font-bold">尚無進行中的專案</div>}
        </div>
        <button onClick={() => setIsAdding(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-2xl shadow-white/20 z-50 hover:scale-110 transition-transform"><Plus size={32} strokeWidth={3} /></button>
      </div>
    );
  };

  const ProjectDetailView = () => {
    if (!activeProject) return null;
    const pTasks = tasks.filter(t => t.projectId === activeProject.id && !t.completed && !t.isToday);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskSize, setNewTaskSize] = useState('medium'); 

    return (
      <div className="p-6 min-h-screen bg-[#121212] flex flex-col h-screen">
        <header className="flex items-center justify-between mb-8 pt-4 flex-shrink-0">
          <button onClick={() => setView('projects')} className="p-3 bg-zinc-800 rounded-2xl"><ArrowLeft className="text-white" /></button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white max-w-[150px] truncate">{activeProject.name}</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">Workspace</p>
          </div>
          <button onClick={() => deleteProject(activeProject.id)} className="p-3 bg-red-900/20 text-red-500 rounded-2xl"><Trash2 size={20} /></button>
        </header>

        <div className="bg-zinc-900 p-4 rounded-3xl mb-4 border border-zinc-800 flex-shrink-0 shadow-xl z-20">
           <div className="flex gap-2 mb-3">
              {['big', 'medium', 'small'].map(size => (
                <button key={size} onClick={() => setNewTaskSize(size)} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", newTaskSize === size ? (size==='big'?"bg-orange-500 text-white":size==='medium'?"bg-blue-600 text-white":"bg-emerald-500 text-white") : "bg-black/40 text-zinc-600")}>{size}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="輸入步驟..." className="flex-1 bg-black text-white px-4 py-3 rounded-2xl outline-none text-center placeholder:text-zinc-700" onKeyDown={e => e.key === 'Enter' && newTaskTitle && (addTask(activeProject.id, newTaskTitle, newTaskSize), setNewTaskTitle(''))} />
              <button onClick={() => { if(newTaskTitle) { addTask(activeProject.id, newTaskTitle, newTaskSize); setNewTaskTitle(''); }}} className="bg-white text-black px-4 rounded-2xl hover:bg-gray-200"><Plus strokeWidth={3} /></button>
            </div>
        </div>

        <Reorder.Group axis="y" values={pTasks} onReorder={handleReorder} className="flex-1 overflow-y-auto pr-1 -mr-2 pb-20 custom-scrollbar space-y-4" layoutScroll>
            {pTasks.map((t) => (
               <SortableTaskItem key={t.id} task={t} deleteTask={deleteTask} toggleTaskToday={toggleTaskToday} completeTask={completeTask} />
            ))}
            {pTasks.length === 0 && <div className="text-center text-zinc-800 font-bold text-6xl opacity-20 mt-20">EMPTY</div>}
        </Reorder.Group>
      </div>
    );
  };

  const CompletedView = () => {
    const list = tasks.filter(t => t.completed).sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt));
    const totalMinutes = list.reduce((acc, t) => {
        if (t.size === 'big') return acc + 90;
        if (t.size === 'medium') return acc + 30;
        if (t.size === 'small') return acc + 10;
        return acc + 2;
    }, 0);

    return (
      <div className="p-6 min-h-screen bg-[#121212]">
        <header className="flex items-center justify-center relative mb-8 pt-4">
          <button onClick={() => setView('home')} className="absolute left-0 p-3 bg-zinc-800 rounded-2xl"><ArrowLeft className="text-white" /></button>
          <h1 className="text-xl font-black text-white tracking-widest uppercase">History</h1>
        </header>
        <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-6 rounded-3xl border border-white/10 mb-8 flex items-center justify-between shadow-lg">
            <div><div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Total Focus</div><div className="text-3xl font-black text-white flex items-baseline gap-2">{formatDuration(totalMinutes)}</div></div>
            <div className="bg-white/5 p-4 rounded-full"><Timer size={32} className="text-blue-400" /></div>
        </div>
        <div className="space-y-3">
           {list.map(t => (
             <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={t.id} className="p-4 bg-zinc-900 rounded-2xl flex justify-between items-center border border-white/5">
                <div className="flex flex-col">
                  <span className="text-white font-medium">{t.title}</span>
                  <span className="text-[10px] text-zinc-600 uppercase font-black">{new Date(t.completedAt).toLocaleDateString()}</span>
                </div>
                <div className={cn("w-3 h-3 rounded-full", t.size==='big'?"bg-orange-900":t.size==='medium'?"bg-blue-900":t.size==='small'?"bg-emerald-900":"bg-purple-900")} />
             </motion.div>
           ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto relative overflow-hidden shadow-2xl bg-black min-h-screen font-sans">
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.2 }} className="h-full">
          {view === 'home' && <HomeView />}
          {view === 'quick-tasks' && <QuickTasksView />}
          {view === 'settings' && <SettingsView />}
          {view === 'projects' && <ProjectsView />}
          {view === 'project-detail' && <ProjectDetailView />}
          {view === 'completed' && <CompletedView />}
        </motion.div>
      </AnimatePresence>

      {/* 專案完成模態窗 */}
      <AnimatePresence>
        {completedProjectInfo && (
           <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
              <motion.div initial={{scale:0.8, y:20}} animate={{scale:1, y:0}} className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 p-8 rounded-3xl text-center shadow-2xl w-full max-w-sm">
                 <div className="mb-6 flex justify-center"><PartyPopper size={64} className="text-yellow-400 animate-bounce" /></div>
                 <h2 className="text-2xl font-black text-white mb-2">恭喜完成！</h2>
                 <p className="text-zinc-400 mb-6">您已完成 <span className="text-white font-bold">{completedProjectInfo.name}</span></p>
                 <div className="bg-white/5 p-4 rounded-2xl mb-8">
                    <p className="text-xs text-white/50 uppercase tracking-widest mb-1">總投入時間</p>
                    <p className="text-3xl font-black text-white">{formatDuration(completedProjectInfo.duration)}</p>
                 </div>
                 <button onClick={() => { deleteProject(completedProjectInfo.id, true); setCompletedProjectInfo(null); }} className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform">太棒了！</button>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}