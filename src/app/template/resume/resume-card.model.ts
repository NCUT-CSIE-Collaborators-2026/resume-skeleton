import { ResumeCardElement } from './resume-card/resume-card-element.model';

export type CardElement = ResumeCardElement;

export interface Card {
  id: string;
  title: string;
  subtitle?: string;
  layout: number;
  elements: CardElement[];
}
