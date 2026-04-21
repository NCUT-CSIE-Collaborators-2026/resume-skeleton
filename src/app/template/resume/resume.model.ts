import { ResumeCardElement } from './resume-card/resume-element/resume-card-element.model';

export type CardElement = ResumeCardElement;

export interface Card {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  layout: number;
  elements: CardElement[];
}
