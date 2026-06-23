
export type UserRole = 'master' | 'basic';

export interface ServiceCategory {
  id: string;
  name: string;
  color: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  isHidden?: boolean;
}

export interface Task {
  id: string;
  personId: string;
  serviceCategoryId: string; 
  invoiceQuantity: number; // Qtd de Notas Fiscais
  date: string; // ISO date string YYYY-MM-DD
  processQuantity: number; // Qtd de Processos (antigo quantity)
  assignedProcesses: number; // Qtd de Processos Atribuídos
  wasNotRealized?: boolean; // Toggled to declare that this task was intentionally not completed
}

export interface Particularity {
  id: string;
  personId: string;
  date: string;
  type: 'Saúde' | 'Treinamento' | 'Administrativo' | 'Outros';
  description: string;
}

export interface ProcessFlow {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  received: number;
  transferred: number;
  completed: number;
}

export interface Pendency {
  id: string;
  personId: string;
  documentType: string;
  sector: 'GCIF' | 'JURÍDICO';
  pendingType: string;
  date: string; // ISO date string YYYY-MM-DD
}

export interface AppState {
  people: Person[];
  tasks: Task[];
  particularities: Particularity[];
  processFlows: ProcessFlow[];
  serviceCategories: ServiceCategory[];
  userRole: UserRole;
  pendencies?: Pendency[]; // Optional to avoid breaking old stored state
  pendencyDocumentTypes?: string[];
  pendencyTypes?: string[];
}
