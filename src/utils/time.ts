export const formatTime=(seconds:number)=>{if(!Number.isFinite(seconds))return '0:00';const m=Math.floor(seconds/60);return `${m}:${Math.floor(seconds%60).toString().padStart(2,'0')}`};
