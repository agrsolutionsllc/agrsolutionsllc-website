const toggle=document.querySelector('.nav-toggle');
const nav=document.querySelector('.nav');

toggle?.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded',open);
});

document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));

document.getElementById('year').textContent=new Date().getFullYear();

const contactForm=document.getElementById('contactForm');
contactForm?.addEventListener('submit',(event)=>{
  event.preventDefault();

  const data=new FormData(contactForm);
  const nombre=(data.get('Nombre')||'').toString().trim();
  const telefono=(data.get('Telefono')||'').toString().trim();
  const servicio=(data.get('Servicio')||'').toString().trim();
  const mensaje=(data.get('Mensaje')||'').toString().trim();

  const text=[
    'Hola AGR Solutions LLC, deseo solicitar información.',
    '',
    'Nombre: '+nombre,
    'Teléfono: '+telefono,
    'Servicio de interés: '+servicio,
    mensaje ? 'Mensaje: '+mensaje : ''
  ].filter(Boolean).join('\n');

  const url='https://wa.me/12038240351?text='+encodeURIComponent(text);
  window.open(url,'_blank','noopener');
});
