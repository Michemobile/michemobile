
export interface Professional {
  id: string;
  name: string;
  services: string[];
  rating: number;
  image: string;
  bio?: string;
  location?: string;
  availability?: string[];
  verified: boolean;
}

// No mock professionals - only add new professionals that sign up
export const professionals: Professional[] = [];
