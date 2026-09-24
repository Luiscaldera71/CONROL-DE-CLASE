import { Course, Student, Activity, Submission, AttendanceSession, BehaviorRecord, TeacherProfile } from '../types';

export const DEMO_TEACHER: TeacherProfile = {
  uid: 'demo-teacher-001',
  email: 'profesor.demo@aulacontrol.edu',
  displayName: 'Prof. Carlos Mendoza',
  institution: 'Colegio Integrado San Juan Bautista',
  createdAt: '2026-02-01T08:00:00Z',
  settings: {
    gradeScale: {
      min: 0.0,
      max: 5.0,
      passingGrade: 3.0
    },
    riskThresholds: {
      minGrade: 3.0,
      minAttendanceRate: 75,
      maxUnsubmitted: 3
    },
    periods: ['Periodo 1', 'Periodo 2', 'Periodo 3', 'Periodo 4'],
    behaviorCategories: [
      { id: 'positive', label: 'Participación Destacada', type: 'positive', icon: '⭐' },
      { id: 'recognition', label: 'Reconocimiento Académico', type: 'positive', icon: '🏆' },
      { id: 'warning', label: 'Llamado de Atención', type: 'negative', icon: '⚠️' },
      { id: 'non_compliance', label: 'Incumplimiento de Deberes', type: 'negative', icon: '❌' },
      { id: 'social', label: 'Convivencia y Compañerismo', type: 'positive', icon: '🤝' }
    ]
  }
};

export const DEMO_COURSES: Course[] = [
  {
    id: 'course-7-1',
    teacherId: 'demo-teacher-001',
    name: '7°-1',
    gradeLevel: '7°',
    group: '1',
    academicYear: 2026,
    institution: 'Colegio Integrado San Juan Bautista',
    shift: 'Mañana',
    subject: 'Tecnología e Informática',
    currentPeriod: 'Periodo 1',
    studentCount: 35,
    createdAt: '2026-02-05T08:00:00Z'
  },
  {
    id: 'course-7-2',
    teacherId: 'demo-teacher-001',
    name: '7°-2',
    gradeLevel: '7°',
    group: '2',
    academicYear: 2026,
    institution: 'Colegio Integrado San Juan Bautista',
    shift: 'Mañana',
    subject: 'Tecnología e Informática',
    currentPeriod: 'Periodo 1',
    studentCount: 32,
    createdAt: '2026-02-05T08:30:00Z'
  },
  {
    id: 'course-8-1',
    teacherId: 'demo-teacher-001',
    name: '8°-1',
    gradeLevel: '8°',
    group: '1',
    academicYear: 2026,
    institution: 'Colegio Integrado San Juan Bautista',
    shift: 'Tarde',
    subject: 'Robótica y Algoritmos',
    currentPeriod: 'Periodo 1',
    studentCount: 34,
    createdAt: '2026-02-06T09:00:00Z'
  }
];

// Nombres y apellidos hispanos para 35 estudiantes
const STUDENT_NAMES = [
  'Juan David Pérez Gómez',
  'María Camila López Rodríguez',
  'Carlos Andrés Díaz Ortiz',
  'Valentina Torres Morales',
  'Santiago Ramírez Castro',
  'Sofía Hernández Vargas',
  'Mateo Gómez Pineda',
  'Isabella Restrepo Meza',
  'Samuel Martínez Rincón',
  'Luciana Navarro Gil',
  'Nicolás Salazar Peña',
  'Mariana Castro Benítez',
  'Daniel Felipe Rojas Duarte',
  'Sara Gabriela Silva Mora',
  'Alejandro Vega Cárdenas',
  'Paula Andrea Mendoza Ríos',
  'Emiliano Ruiz Herrera',
  'Valeria Parra Marín',
  'Sebastián Osorio Cardona',
  'Gabriela Muñoz Delgado',
  'David Esteban Quintero Lara',
  'Camila Andrea Serrano Soler',
  'Felipe Andrés Gallego Hoyos',
  'Manuela Rueda Cáceres',
  'Joaquín Morales Fuentes',
  'Catalina Ospina Franco',
  'Lucas Jaramillo Aguirre',
  'Salomé Arango Zapata',
  'Martín Guzmán Villada',
  'Antonella Londoño Toro',
  'Tomás Correa Bedoya',
  'Dulce María Betancur Cano',
  'Jerónimo Palacio Serna',
  'Ana Sofía Giraldo Henao',
  'Ángel Gabriel Hincapié Cruz'
];

// Códigos únicos predeterminados de prueba para garantizar consistencia y demostración
const DEMO_CODES = [
  'A7K92P', 'B82LM4', 'C49XR8', 'D23TY9', 'E91ZP2',
  'F65KV3', 'G18MN7', 'H74LP1', 'J36QR5', 'K92WS8',
  'L51TX4', 'M83YB9', 'N27KC6', 'P64ZD2', 'Q19RE5',
  'R82VF7', 'S35TG1', 'T76WH4', 'U29XJ8', 'V63YM2',
  'W17ZN5', 'X84BP9', 'Y28CR3', 'Z52DS6', 'A93ET7',
  'B47FV1', 'C81GW4', 'D25HX8', 'E69JY2', 'F14KZ5',
  'G78LA3', 'H32MB6', 'J86NC9', 'K41PD2', 'L95RE4'
];

export const DEMO_STUDENTS: Student[] = STUDENT_NAMES.map((name, index) => ({
  id: `std-${index + 1}`,
  courseId: 'course-7-1',
  listNumber: index + 1,
  fullName: name,
  documentNumber: `1098${700000 + index}`,
  uniqueCode: DEMO_CODES[index],
  active: true,
  createdAt: '2026-02-05T09:00:00Z'
}));

export const DEMO_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    courseId: 'course-7-1',
    title: 'Actividad 1 - Fundamentos de Pensamiento Computacional',
    description: 'Diagramas de flujo y resolución de problemas lógicos cotidianos.',
    period: 'Periodo 1',
    weightPercentage: 20,
    maxGrade: 5.0,
    dueDate: '2026-02-18',
    status: 'closed',
    createdAt: '2026-02-06T10:00:00Z'
  },
  {
    id: 'act-2',
    courseId: 'course-7-1',
    title: 'Actividad 2 - Animación Básica en Scratch',
    description: 'Creación de diálogos entre dos personajes con movimientos y bucles.',
    period: 'Periodo 1',
    weightPercentage: 20,
    maxGrade: 5.0,
    dueDate: '2026-03-04',
    status: 'closed',
    createdAt: '2026-02-20T10:00:00Z'
  },
  {
    id: 'act-3',
    courseId: 'course-7-1',
    title: 'Actividad 3 - Variables y Condiciones (If / Else)',
    description: 'Construcción de un minijuego de preguntas y respuestas con marcador de puntos.',
    period: 'Periodo 1',
    weightPercentage: 20,
    maxGrade: 5.0,
    dueDate: '2026-03-18',
    status: 'active',
    createdAt: '2026-03-06T10:00:00Z'
  },
  {
    id: 'act-4',
    courseId: 'course-7-1',
    title: 'Actividad 4 - Sensores y Operadores Matemáticos',
    description: 'Detección de bordes y control de objetos mediante teclado o ratón.',
    period: 'Periodo 1',
    weightPercentage: 20,
    maxGrade: 5.0,
    dueDate: '2026-03-25',
    status: 'active',
    createdAt: '2026-03-12T10:00:00Z'
  },
  {
    id: 'act-5',
    courseId: 'course-7-1',
    title: 'Proyecto Final - Videojuego Educativo Integrador',
    description: 'Desarrollo en parejas de un juego interactivo con niveles y presentación grupal.',
    period: 'Periodo 1',
    weightPercentage: 20,
    maxGrade: 5.0,
    dueDate: '2026-04-08',
    status: 'active',
    createdAt: '2026-03-15T10:00:00Z'
  }
];

// Submissions con variedad intencional para probar el motor de riesgo (algunos con riesgo alto, medio y bajo)
export const DEMO_SUBMISSIONS: Submission[] = [];

DEMO_STUDENTS.forEach((student, sIdx) => {
  DEMO_ACTIVITIES.forEach((activity, aIdx) => {
    // Caso 1: Estudiante con alerta crítica (Juan David Pérez, std-1) -> bajas notas y faltas
    if (sIdx === 0) {
      if (aIdx === 0) {
        DEMO_SUBMISSIONS.push({
          id: `sub-${student.id}-${activity.id}`,
          activityId: activity.id,
          studentId: student.id,
          courseId: 'course-7-1',
          status: 'delivered',
          grade: 2.3,
          feedback: 'Incompleto, faltaron las condiciones del flujo.',
          submittedAt: '2026-02-18T14:30:00Z'
        });
      } else {
        DEMO_SUBMISSIONS.push({
          id: `sub-${student.id}-${activity.id}`,
          activityId: activity.id,
          studentId: student.id,
          courseId: 'course-7-1',
          status: 'not_delivered',
          grade: null,
          feedback: 'No entregó en la fecha estipulada.',
          submittedAt: undefined
        });
      }
    }
    // Caso 2: Estudiante en seguimiento medio (María Camila López, std-2) -> promedio 3.1
    else if (sIdx === 1) {
      const grades = [3.2, 3.0, 3.1, null, null];
      const statuses: ('delivered' | 'not_delivered' | 'pending')[] = ['delivered', 'delivered', 'delivered', 'not_delivered', 'pending'];
      DEMO_SUBMISSIONS.push({
        id: `sub-${student.id}-${activity.id}`,
        activityId: activity.id,
        studentId: student.id,
        courseId: 'course-7-1',
        status: statuses[aIdx],
        grade: grades[aIdx],
        feedback: 'Buen esfuerzo, afianzar conceptos de bucles.',
        submittedAt: statuses[aIdx] === 'delivered' ? '2026-02-18T10:00:00Z' : undefined
      });
    }
    // Caso 3: Carlos Andrés Díaz (std-3) -> Excelente estudiante 4.8
    else if (sIdx === 2) {
      const grades = [4.8, 5.0, 4.6, 4.9, null];
      const statuses: ('delivered' | 'pending')[] = ['delivered', 'delivered', 'delivered', 'delivered', 'pending'];
      DEMO_SUBMISSIONS.push({
        id: `sub-${student.id}-${activity.id}`,
        activityId: activity.id,
        studentId: student.id,
        courseId: 'course-7-1',
        status: statuses[aIdx],
        grade: grades[aIdx],
        feedback: 'Excelente desarrollo y creatividad.',
        submittedAt: '2026-02-17T11:00:00Z'
      });
    }
    // Resto de los 32 estudiantes: notas realistas distribuidas
    else {
      // Actividades pasadas 1 y 2 tienen entregas de casi todos
      if (aIdx < 2) {
        const randGrade = parseFloat((3.3 + (Math.sin(sIdx + aIdx) * 1.4)).toFixed(1));
        const clampedGrade = Math.min(5.0, Math.max(2.5, randGrade));
        DEMO_SUBMISSIONS.push({
          id: `sub-${student.id}-${activity.id}`,
          activityId: activity.id,
          studentId: student.id,
          courseId: 'course-7-1',
          status: 'delivered',
          grade: clampedGrade,
          submittedAt: '2026-02-18T10:00:00Z'
        });
      } else if (aIdx === 2) {
        // Actividad 3: 75% entregaron
        if (sIdx % 4 === 0) {
          DEMO_SUBMISSIONS.push({
            id: `sub-${student.id}-${activity.id}`,
            activityId: activity.id,
            studentId: student.id,
            courseId: 'course-7-1',
            status: 'not_delivered',
            grade: null
          });
        } else {
          const randGrade = parseFloat((3.5 + (Math.cos(sIdx) * 1.2)).toFixed(1));
          const clampedGrade = Math.min(5.0, Math.max(2.8, randGrade));
          DEMO_SUBMISSIONS.push({
            id: `sub-${student.id}-${activity.id}`,
            activityId: activity.id,
            studentId: student.id,
            courseId: 'course-7-1',
            status: 'delivered',
            grade: clampedGrade,
            submittedAt: '2026-03-18T15:00:00Z'
          });
        }
      } else {
        // Actividades 4 y 5: pendientes
        DEMO_SUBMISSIONS.push({
          id: `sub-${student.id}-${activity.id}`,
          activityId: activity.id,
          studentId: student.id,
          courseId: 'course-7-1',
          status: 'pending',
          grade: null
        });
      }
    }
  });
});

// Sesiones de Asistencia de prueba
const ATTENDANCE_DATES = [
  '2026-02-10', '2026-02-17', '2026-02-24', '2026-03-03', '2026-03-10', '2026-03-17'
];

export const DEMO_ATTENDANCE_SESSIONS: AttendanceSession[] = ATTENDANCE_DATES.map((date, dIdx) => {
  const records: Record<string, any> = {};
  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;

  DEMO_STUDENTS.forEach((student, sIdx) => {
    // Estudiante std-1 tiene muchas fallas
    let status: 'present' | 'absent' | 'late' | 'excused' = 'present';
    if (sIdx === 0 && (dIdx === 1 || dIdx === 3 || dIdx === 5)) {
      status = 'absent';
    } else if (sIdx === 0 && dIdx === 2) {
      status = 'late';
    } else if (sIdx % 11 === 0 && dIdx === 2) {
      status = 'absent';
    } else if (sIdx % 7 === 0 && dIdx === 4) {
      status = 'late';
    } else if (sIdx % 9 === 0 && dIdx === 1) {
      status = 'excused';
    }

    records[student.id] = {
      studentId: student.id,
      status,
      timestamp: `${date}T07:15:00Z`,
      source: dIdx % 2 === 0 ? 'qr' : 'manual'
    };

    if (status === 'present') present++;
    else if (status === 'absent') absent++;
    else if (status === 'late') late++;
    else if (status === 'excused') excused++;
  });

  return {
    id: `att-session-${date}`,
    courseId: 'course-7-1',
    date,
    period: 'Periodo 1',
    records,
    summary: {
      present,
      absent,
      late,
      excused,
      total: DEMO_STUDENTS.length
    },
    createdAt: `${date}T07:30:00Z`
  };
});

// Comportamientos de prueba
export const DEMO_BEHAVIORS: BehaviorRecord[] = [
  {
    id: 'beh-1',
    courseId: 'course-7-1',
    studentId: 'std-1',
    date: '2026-03-10 08:30',
    type: 'warning',
    severity: 'medium',
    title: 'Distracción en clase y celular',
    description: 'Uso reiterado del teléfono celular durante la explicación del docente sobre bucles.',
    observation: 'Se dialogó con el estudiante y se comprometió a mejorar la atención.',
    createdAt: '2026-03-10T08:35:00Z'
  },
  {
    id: 'beh-2',
    courseId: 'course-7-1',
    studentId: 'std-3',
    date: '2026-03-12 09:15',
    type: 'positive',
    severity: 'low',
    title: 'Apoyo y solidaridad con compañeros',
    description: 'Orientó con paciencia a dos compañeros en la depuración del código en Scratch.',
    createdAt: '2026-03-12T09:20:00Z'
  },
  {
    id: 'beh-3',
    courseId: 'course-7-1',
    studentId: 'std-4',
    date: '2026-03-17 07:45',
    type: 'recognition',
    severity: 'low',
    title: 'Proyecto creativo sobresaliente',
    description: 'Diseñó animaciones propias con diseño gráfico original para el proyecto de aula.',
    createdAt: '2026-03-17T08:00:00Z'
  }
];
