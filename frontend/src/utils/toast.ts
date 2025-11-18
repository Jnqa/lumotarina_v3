export function showToast(message: string, opts: { duration?: number, type?: 'info'|'error'|'success' } = {}){
  const duration = opts.duration || 3000;
  const type = opts.type || 'info';
  const root = document.createElement('div');
  root.className = `simple-toast simple-toast-${type}`;
  root.textContent = message;
  root.style.opacity = '0';
  root.style.transition = 'opacity 180ms ease, transform 220ms ease';
  root.style.transform = 'translateY(6px)';
  document.body.appendChild(root);
  // position container
  root.style.position = 'fixed';
  root.style.right = '16px';
  root.style.bottom = `${16 + (document.querySelectorAll('.simple-toast').length * 60)}px`;
  root.style.zIndex = '9999';
  setTimeout(()=>{ root.style.opacity = '1'; root.style.transform = 'translateY(0)'; }, 20);
  setTimeout(()=>{
    root.style.opacity = '0'; root.style.transform = 'translateY(6px)';
    setTimeout(()=>{ try{ document.body.removeChild(root); }catch(e){} }, 220);
  }, duration);
}
