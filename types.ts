
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
  invoiceQuantity: number; // Qtd de Notas Fiscais
  date: string; // ISO date string YYYY-MM-DD
  processQuantity: number; // Qtd de Processos (antigo quantity)
  assignedProcesses: number; // Qtd de Processos Atribuídos
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
}
