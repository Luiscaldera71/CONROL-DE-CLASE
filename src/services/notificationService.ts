import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Course, Activity, Submission, AppNotification } from '../types';
import {
  getColombiaDateString,
  getTomorrowDateString,
  getColombiaDayName,
  getTomorrowDayName,
  getColombiaTimeString,
  formatTime12h
} from '../utils/dateUtils';

const NOTIFICATIONS_STORAGE_KEY = 'aulacontrol_notifications_history';
let channelCreated = false;

export const notificationService = {
  // Inicializar canal de notificaciones en Android
  async initChannel(): Promise<void> {
    if (Capacitor.isNativePlatform() && !channelCreated) {
      try {
        await LocalNotifications.createChannel({
          id: 'aulacontrol_channel',
          name: 'Recordatorios de Clases y Actividades',
          description: 'Notificaciones automáticas de horarios escolares y entregas',
          importance: 5, // High importance (heads-up / banner)
          visibility: 1, // Public on lockscreen
          sound: 'beep.wav',
          vibration: true,
          lights: true
        });
        channelCreated = true;
      } catch (e) {
        console.warn('Error creando canal de notificaciones Android:', e);
      }
    }
  },

  // Solicitar permisos de notificación (Android nativo o Web)
  async requestPermission(): Promise<boolean> {
    await this.initChannel();

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
      } catch (err) {
        console.warn('Error al solicitar permiso en Android:', err);
        return false;
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch {
        return false;
      }
    }

    return false;
  },

  // Consultar estado actual del permiso
  async checkPermission(): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await LocalNotifications.checkPermissions();
        return status.display; // 'granted' | 'denied' | 'prompt'
      } catch {
        return 'prompt';
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission; // 'granted' | 'denied' | 'default'
    }

    return 'unsupported';
  },

  // Obtener historial de notificaciones guardadas en la app
  getNotifications(): AppNotification[] {
    try {
      const data = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Guardar notificaciones en storage
  saveNotifications(list: AppNotification[]): void {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Error guardando notificaciones:', e);
    }
  },

  // Enviar notificación instantánea al celular (Android barra de estado) o navegador (Web)
  async sendNativeNotification(title: string, body: string, idNum?: number): Promise<void> {
    await this.initChannel();

    // 1. Android Nativo (Barra de estado / teléfono celular)
    if (Capacitor.isNativePlatform()) {
      try {
        const notifId = idNum || Math.floor(Math.random() * 1000000) + 1;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title,
              body,
              channelId: 'aulacontrol_channel',
              smallIcon: 'ic_launcher_round',
              iconColor: '#2563EB',
              sound: undefined
            }
          ]
        });
        return;
      } catch (err) {
        console.warn('Error enviando notificación local en Android:', err);
      }
    }

    // 2. Web / Navegador
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg'
        });
      } catch (e) {
        console.warn('Error mostrando notificación en navegador web:', e);
      }
    }
  },

  // Programar o verificar notificaciones automáticas para:
  // a) Mañana tienes clase (24 horas antes)
  // b) Ya es hora de la clase / Hoy tienes clase
  // c) Actividades que vencen mañana
  async checkAndGenerateNotifications(
    courses: Course[],
    activities: Activity[],
    submissions: Submission[]
  ): Promise<AppNotification[]> {
    const todayColombia = getColombiaDateString();
    const tomorrowColombia = getTomorrowDateString();
    const todayDayName = getColombiaDayName();
    const tomorrowDayName = getTomorrowDayName();
    const currentColombiaTime = getColombiaTimeString(); // "HH:mm"

    const notifications = this.getNotifications();
    const updated = [...notifications];
    let newCount = 0;

    // =========================================================================
    // 1. NOTIFICACIÓN 24 HORAS ANTES: "MAÑANA TIENES CLASES"
    // =========================================================================
    for (const course of courses) {
      if (!course.scheduleDays || course.scheduleDays.length === 0) continue;

      // Si mañana es uno de los días que el docente dictará clase en este curso
      if (course.scheduleDays.includes(tomorrowDayName)) {
        const timeFormatted = course.scheduleTime
          ? `${formatTime12h(course.scheduleTime)}${course.scheduleEndTime ? ` - ${formatTime12h(course.scheduleEndTime)}` : ''}`
          : 'Horario habitual';
        const notifId = `class_tomorrow_${course.id}_${tomorrowColombia}`;
        const alreadyNotified = updated.some(n => n.id === notifId);

        if (!alreadyNotified) {
          const newNotif: AppNotification = {
            id: notifId,
            type: 'class_reminder',
            title: `⏰ Mañana tienes clase con ${course.name}`,
            message: `Recordatorio 24 horas antes: Mañana ${tomorrowDayName} tienes clase de ${course.subject} (${timeFormatted}).`,
            courseName: course.name,
            timestamp: Date.now(),
            read: false
          };
          updated.unshift(newNotif);
          newCount++;
          await this.sendNativeNotification(newNotif.title, newNotif.message);
        }
      }
    }

    // =========================================================================
    // 2. NOTIFICACIÓN DEL DÍA DE LA CLASE: "YA ES HORA DE LA CLASE" / HOY TIENES CLASE
    // =========================================================================
    for (const course of courses) {
      if (!course.scheduleDays || course.scheduleDays.length === 0) continue;

      if (course.scheduleDays.includes(todayDayName)) {
        const timeFormatted = course.scheduleTime
          ? `${formatTime12h(course.scheduleTime)}${course.scheduleEndTime ? ` - ${formatTime12h(course.scheduleEndTime)}` : ''}`
          : 'Horario escolar';
        const isNearOrTime = course.scheduleTime ? currentColombiaTime >= course.scheduleTime : true;

        const notifId = `class_today_${course.id}_${todayColombia}`;
        const alreadyNotified = updated.some(n => n.id === notifId);

        if (!alreadyNotified) {
          const titleText = isNearOrTime
            ? `🔔 ¡Ya es hora de tu clase con ${course.name}!`
            : `🔔 Hoy tienes clase con ${course.name}`;
          const messageText = isNearOrTime
            ? `Inicia la sesión de ${course.subject} (${timeFormatted}). Recuerda tomar la asistencia por QR.`
            : `Tienes sesión de ${course.subject} programada para hoy a las ${timeFormatted}.`;

          const newNotif: AppNotification = {
            id: notifId,
            type: 'class_reminder',
            title: titleText,
            message: messageText,
            courseName: course.name,
            timestamp: Date.now(),
            read: false
          };
          updated.unshift(newNotif);
          newCount++;
          await this.sendNativeNotification(newNotif.title, newNotif.message);
        }
      }
    }

    // =========================================================================
    // 3. ACTIVIDADES PENDIENTES QUE VENCEN MAÑANA (Recordatorio 24h antes)
    // =========================================================================
    for (const act of activities) {
      if (act.dueDate === tomorrowColombia && act.status !== 'closed') {
        const notifId = `activity_due_${act.id}_${tomorrowColombia}`;
        const exists = updated.some(n => n.id === notifId);

        if (!exists) {
          const course = courses.find(c => c.id === act.courseId);
          const actSubmissions = submissions.filter(s => s.activityId === act.id && s.status === 'delivered');
          const courseName = course ? course.name : 'tu curso';

          const newNotif: AppNotification = {
            id: notifId,
            type: 'activity_due',
            title: `⏰ Actividad por vencer mañana: ${act.title}`,
            message: `La actividad "${act.title}" de ${courseName} vence mañana. Van ${actSubmissions.length} entregas registradas.`,
            courseName,
            activityId: act.id,
            timestamp: Date.now(),
            read: false
          };
          updated.unshift(newNotif);
          newCount++;
          await this.sendNativeNotification(newNotif.title, newNotif.message);
        }
      }
    }

    if (newCount > 0) {
      const trimmed = updated.slice(0, 40);
      this.saveNotifications(trimmed);
      return trimmed;
    }

    return notifications;
  },

  // Marcar todas como leídas
  markAllAsRead(): AppNotification[] {
    const list = this.getNotifications().map(n => ({ ...n, read: true }));
    this.saveNotifications(list);
    return list;
  },

  // Eliminar una notificación
  deleteNotification(id: string): AppNotification[] {
    const list = this.getNotifications().filter(n => n.id !== id);
    this.saveNotifications(list);
    return list;
  }
};
