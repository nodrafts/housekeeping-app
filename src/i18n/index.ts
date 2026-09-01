import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export type AppLanguage = 'en' | 'es';

const LANGUAGE_STORAGE_KEY = 'nodrafts.housekeeping.language';

const en = {
  common: {
    cancel: 'Cancel', continue: 'Continue', retry: 'Retry', save: 'Save', saving: 'Saving...',
    logout: 'Logout', signOut: 'Sign out', yes: 'Yes', no: 'No', unknown: 'Unknown',
  },
  navigation: {
    housekeeping: 'Housekeeping', schedule: 'Schedule', settings: 'Settings', profile: 'Profile',
    roomDetails: 'Room details', reportIssue: 'Report an issue',
  },
  auth: {
    welcome: 'Welcome back', subtitle: 'Sign in to continue to housekeeping', email: 'Email',
    password: 'Password', signIn: 'Sign in', signingIn: 'Signing in...', invalid: 'Invalid email or password',
    selectHotel: 'Select a property', selectHotelSubtitle: 'Choose where you are working today',
    loadHotelsFailed: 'Could not load properties.', tapRetry: 'Tap to retry',
    terms: 'By signing in, you agree to our Terms of Service and Privacy Policy.',
  },
  rooms: {
    title: 'Housekeeping', today: 'Today {{date}}', room: 'Room {{number}}', floor: 'Floor {{floor}}',
    floorMissing: 'Floor not set', noRooms: 'No rooms due', noRoomsDescription: 'Today has no housekeeping tasks assigned for {{hotelCode}}.',
    completePercent: '{{percent}}% complete', issues_one: '{{count}} issue', issues_other: '{{count}} issues',
    starting: 'Starting...', cleaningStarted: 'Cleaning started', elapsed: 'Cleaning for {{time}}',
    couldNotStart: 'Could not start cleaning',
  },
  status: { ready: 'Ready', cleaning: 'Cleaning', stayOver: 'Stay over', checkout: 'Checkout' },
  checklist: {
    title: 'Checklist', completed: 'Completed', skipped: 'Skipped', markCompleted: 'Mark as completed',
    tapToSkip: 'Tap if not completed', roomReady: 'Room is Ready', markReady: 'Mark as Ready',
  },
  checklistItems: {
    bedsheets: 'Replace bedsheets and pillow covers', bathroom: 'Clean bathroom and replace towels',
    amenities: 'Restock soaps and amenities', trash: 'Empty trash bins', floor: 'Vacuum and mop the floor',
  },
  activity: { today: "Today's activity" },
  settings: {
    title: 'Settings', account: 'Account', name: 'Name', email: 'Email', role: 'Role', hotel: 'Hotel',
    admin: 'Admin', staff: 'Staff', language: 'Language', languageDescription: 'Choose the language used in the app.',
    english: 'English', spanish: 'Español', logoutTitle: 'Logout', logoutConfirm: 'Are you sure?',
  },
  profile: { title: 'Profile', employee: 'Employee', assignedHotel: 'Assigned hotel' },
  issue: {
    report: 'Report an Issue', missingInfo: 'Missing info', fillAll: 'Please fill in all fields.',
    reported: 'Issue reported', couldNotSend: 'Could not send incident', itemType: 'Item type', item: 'Item',
    issue: 'Issue', category: 'Category', severity: 'Severity', movable: 'Movable', fixed: 'Fixed',
    noIssues: 'No issues found for this item.', safetyMedical: 'Safety / Medical', security: 'Security',
    facilities: 'Facilities', lostFound: 'Lost & Found', complianceRisk: 'Compliance / Risk', other: 'Other',
    low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical', detailsOptional: 'Details, optional',
    actionOptional: 'Action taken, optional', addPhoto: 'Add photo', choosePhoto: 'Choose how to attach the incident photo.',
    camera: 'Take photo', library: 'Choose from library', permissionNeeded: 'Permission needed',
    photoPermission: 'Allow photo access to attach incident images.', cameraPermission: 'Allow camera access to take incident photos.',
    photoLimit: 'Photo limit reached', photoLimitMessage: 'You can add up to {{count}} photos.',
    couldNotAddPhoto: 'Could not add photo', couldNotReport: 'Could not report issue', submit: 'Submit issue',
    whatHappened: 'What happened?', photos: 'Photos', uploading: 'Uploading photos...', sending: 'Sending...',
    sendReport: 'Send report', issueReported: 'Issue reported', cameraChoice: 'Camera', libraryChoice: 'Photo Library',
    brokenItem: 'Broken item', missingItem: 'Missing item', needsRepair: 'Needs repair', safetyConcern: 'Safety concern',
    instructions: 'Choose the item type, item, and issue for this room.', selectItemType: 'Select item type',
    selectItem: 'Select item', selectItemFirst: 'Select item first', selectItemTypeFirst: 'Select item type first',
    selectIssue: 'Select issue', selectCategory: 'Select category', selectSeverity: 'Select severity',
  },
  schedule: {
    title: 'Schedule', loading: 'Loading shifts...', loadFailed: 'Unable to load shifts', noShift: 'No shift',
    swap: 'Swap', swapShift: 'Swap shift', yourShift: 'Your shift', targetDate: 'Target date', swapWith: 'Swap with',
    noStaff: 'No available staff found', availableStaff: 'Available staff for this shift time', submitSwap: 'Request swap',
    submitting: 'Submitting...', day: 'Day', week: 'Week', month: 'Month',
  },
};

const es: typeof en = {
  common: {
    cancel: 'Cancelar', continue: 'Continuar', retry: 'Reintentar', save: 'Guardar', saving: 'Guardando...',
    logout: 'Cerrar sesión', signOut: 'Cerrar sesión', yes: 'Sí', no: 'No', unknown: 'Desconocido',
  },
  navigation: {
    housekeeping: 'Limpieza', schedule: 'Horario', settings: 'Configuración', profile: 'Perfil',
    roomDetails: 'Detalles de la habitación', reportIssue: 'Reportar un problema',
  },
  auth: {
    welcome: 'Bienvenido de nuevo', subtitle: 'Inicia sesión para continuar con la limpieza', email: 'Correo electrónico',
    password: 'Contraseña', signIn: 'Iniciar sesión', signingIn: 'Iniciando sesión...', invalid: 'Correo o contraseña incorrectos',
    selectHotel: 'Seleccionar una propiedad', selectHotelSubtitle: 'Elige dónde trabajarás hoy',
    loadHotelsFailed: 'No se pudieron cargar las propiedades.', tapRetry: 'Toca para reintentar',
    terms: 'Al iniciar sesión, aceptas nuestros Términos de servicio y Política de privacidad.',
  },
  rooms: {
    title: 'Limpieza', today: 'Hoy {{date}}', room: 'Habitación {{number}}', floor: 'Piso {{floor}}',
    floorMissing: 'Piso no asignado', noRooms: 'No hay habitaciones pendientes', noRoomsDescription: 'Hoy no tienes tareas de limpieza asignadas en {{hotelCode}}.',
    completePercent: '{{percent}}% completado', issues_one: '{{count}} problema', issues_other: '{{count}} problemas',
    starting: 'Iniciando...', cleaningStarted: 'Limpieza iniciada', elapsed: 'Limpiando durante {{time}}',
    couldNotStart: 'No se pudo iniciar la limpieza',
  },
  status: { ready: 'Lista', cleaning: 'Limpiando', stayOver: 'Huésped permanece', checkout: 'Salida' },
  checklist: {
    title: 'Lista de tareas', completed: 'Completado', skipped: 'Omitido', markCompleted: 'Marcar como completado',
    tapToSkip: 'Toca si no se completó', roomReady: 'La habitación está lista', markReady: 'Marcar como lista',
  },
  checklistItems: {
    bedsheets: 'Cambiar las sábanas y fundas de almohada', bathroom: 'Limpiar el baño y cambiar las toallas',
    amenities: 'Reponer jabones y artículos de cortesía', trash: 'Vaciar los botes de basura', floor: 'Aspirar y trapear el piso',
  },
  activity: { today: 'Actividad de hoy' },
  settings: {
    title: 'Configuración', account: 'Cuenta', name: 'Nombre', email: 'Correo electrónico', role: 'Rol', hotel: 'Hotel',
    admin: 'Administrador', staff: 'Personal', language: 'Idioma', languageDescription: 'Elige el idioma de la aplicación.',
    english: 'English', spanish: 'Español', logoutTitle: 'Cerrar sesión', logoutConfirm: '¿Estás seguro?',
  },
  profile: { title: 'Perfil', employee: 'Empleado', assignedHotel: 'Hotel asignado' },
  issue: {
    report: 'Reportar un problema', missingInfo: 'Falta información', fillAll: 'Completa todos los campos.',
    reported: 'Problema reportado', couldNotSend: 'No se pudo enviar el incidente', itemType: 'Tipo de artículo', item: 'Artículo',
    issue: 'Problema', category: 'Categoría', severity: 'Gravedad', movable: 'Movible', fixed: 'Fijo',
    noIssues: 'No se encontraron problemas para este artículo.', safetyMedical: 'Seguridad / Médico', security: 'Seguridad',
    facilities: 'Instalaciones', lostFound: 'Objetos perdidos', complianceRisk: 'Cumplimiento / Riesgo', other: 'Otro',
    low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica', detailsOptional: 'Detalles, opcional',
    actionOptional: 'Acción realizada, opcional', addPhoto: 'Agregar foto', choosePhoto: 'Elige cómo adjuntar la foto del incidente.',
    camera: 'Tomar foto', library: 'Elegir de la galería', permissionNeeded: 'Permiso necesario',
    photoPermission: 'Permite el acceso a fotos para adjuntar imágenes.', cameraPermission: 'Permite el acceso a la cámara para tomar fotos.',
    photoLimit: 'Límite de fotos alcanzado', photoLimitMessage: 'Puedes agregar hasta {{count}} fotos.',
    couldNotAddPhoto: 'No se pudo agregar la foto', couldNotReport: 'No se pudo reportar el problema', submit: 'Enviar problema',
    whatHappened: '¿Qué pasó?', photos: 'Fotos', uploading: 'Subiendo fotos...', sending: 'Enviando...',
    sendReport: 'Enviar reporte', issueReported: 'Problema reportado', cameraChoice: 'Cámara', libraryChoice: 'Galería de fotos',
    brokenItem: 'Artículo roto', missingItem: 'Artículo faltante', needsRepair: 'Necesita reparación', safetyConcern: 'Riesgo de seguridad',
    instructions: 'Elige el tipo de artículo, el artículo y el problema de esta habitación.', selectItemType: 'Seleccionar tipo de artículo',
    selectItem: 'Seleccionar artículo', selectItemFirst: 'Primero selecciona un artículo', selectItemTypeFirst: 'Primero selecciona el tipo',
    selectIssue: 'Seleccionar problema', selectCategory: 'Seleccionar categoría', selectSeverity: 'Seleccionar gravedad',
  },
  schedule: {
    title: 'Horario', loading: 'Cargando turnos...', loadFailed: 'No se pudieron cargar los turnos', noShift: 'Sin turno',
    swap: 'Cambiar', swapShift: 'Cambiar turno', yourShift: 'Tu turno', targetDate: 'Fecha deseada', swapWith: 'Cambiar con',
    noStaff: 'No se encontró personal disponible', availableStaff: 'Personal disponible para este horario', submitSwap: 'Solicitar cambio',
    submitting: 'Enviando...', day: 'Día', week: 'Semana', month: 'Mes',
  },
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: { en: { translation: en }, es: { translation: es } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export async function loadAppLanguage() {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const deviceLanguage = getLocales()[0]?.languageCode;
  const language: AppLanguage = stored === 'es' || stored === 'en'
    ? stored
    : deviceLanguage === 'es' ? 'es' : 'en';
  await i18n.changeLanguage(language);
  return language;
}

export async function changeAppLanguage(language: AppLanguage) {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  await i18n.changeLanguage(language);
}

export function appLanguage(): AppLanguage {
  return i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en';
}

export default i18n;
