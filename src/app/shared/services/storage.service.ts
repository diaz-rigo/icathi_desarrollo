import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  setItem(key: string, value: string): void {
    if (this.isBrowser() && window.sessionStorage) {
      sessionStorage.setItem(key, value);
    }
  }

  getItem(key: string): string | null {
    if (this.isBrowser() && window.sessionStorage) {
      return sessionStorage.getItem(key);
    }
    return null;
  }

  removeItem(key: string): void {
    if (this.isBrowser() && window.sessionStorage) {
      sessionStorage.removeItem(key);
    }
  }
}
