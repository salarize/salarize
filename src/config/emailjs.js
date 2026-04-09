import emailjs from '@emailjs/browser';

// EmailJS configuration
export const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_m9q4y6u';
export const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_xckesu7';      // Template pour invitations
export const EMAILJS_SHARE_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_SHARE_TEMPLATE_ID || 'template_ubjoflq'; // Template pour partage rapport
export const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'VuFTbXfCHWjK_3-7M';

// Initialiser EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export { emailjs };
