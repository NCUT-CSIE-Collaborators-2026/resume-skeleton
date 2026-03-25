import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Component({
    selector: 'app-drift-balls',
    standalone: true,
    template: `
    <div class="ambient ambient-left"></div>
    <div class="ambient ambient-right"></div>
  `,
    styles: [`
    .ambient {
        position: fixed;
        width: 200%;
        height: 200%;
        filter: blur(80px);
        opacity: 0.35;
        border-radius: 9999px;
        animation: drift 30s linear infinite;
        pointer-events: none;
        z-index: -1;
    }

    .ambient-left {
        background: radial-gradient(circle, rgba(252, 211, 77, 0.8) 0%, rgba(251, 113, 133, 0.3) 80%, transparent 80%);
    }

    .ambient-right {
        background: radial-gradient(circle, rgba(56, 189, 248, 0.8) 0%, rgba(14, 116, 144, 0.3) 80%, transparent 80%);
        animation-delay: 15s;
    }
  `]
})
export class DriftBallsComponent implements OnInit, OnDestroy {
  private styleElement: HTMLStyleElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    this.generateDriftKeyframes();
    
    // 監聽 resize 事件
    this.resizeObserver = new ResizeObserver(() => {
      this.generateDriftKeyframes();
    });
    this.resizeObserver.observe(document.documentElement);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.styleElement) {
      this.styleElement.remove();
    }
  }

  private generateDriftKeyframes(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const perimeter = 2 * (w + h);

    // 計算每邊的百分比
    const topPercent = (w / perimeter) * 100;
    const rightPercent = topPercent + (h / perimeter) * 100;
    const bottomPercent = rightPercent + (w / perimeter) * 100;

    const keyframe = `
      @keyframes drift {
        0% {
          left: -100%;
          top: -100%;
        }
        ${topPercent}% {
          left: 0%;
          top: -100%;
        }
        ${rightPercent}% {
          left: 0;
          top: 0;
        }
        ${bottomPercent}% {
          left: -100%;
          top: 0%;
        }
        100% {
          left: -100%;
          top: -100%;
        }
      }
    `;

    // 替換舊的 style 元素
    if (this.styleElement) {
      this.styleElement.remove();
    }

    this.styleElement = this.renderer.createElement('style');
    this.renderer.appendChild(this.styleElement, document.createTextNode(keyframe));
    this.renderer.appendChild(document.head, this.styleElement);
  }
}
