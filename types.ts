
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
}

export interface Task {
  id: string;
  personId: string;
  serviceCategoryId: string; 
  invoiceQuantity: number;
  date: string;
  processQuantity: number;
  assignedProcesses: number;
}

export interface Particularity {
  id: string;
  personId: string;
  date: string;
  type: 'Saúde' | 'Treinamento' | 'Administrativo' | 'Outros';
  description: string;
}

export interface AppState {
  people: Person[];
  tasks: Task[];
  particularities: Particularity[];
  serviceCategories: ServiceCategory[];
  userRole: UserRole;
  updatedAt: number; // Timestamp da última alteração
}
