import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';

/**
 * 產生背景漂浮光球效果，並依視窗尺寸動態重建動畫關鍵影格。
 */
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

  /** 初始化動畫並建立視窗尺寸監聽。 */
  ngOnInit(): void {
    this.generateDriftKeyframes();

    this.resizeObserver = new ResizeObserver(() => {
      this.generateDriftKeyframes();
    });
    this.resizeObserver.observe(document.documentElement);
  }

  /** 銷毀監聽器與動態樣式，避免記憶體洩漏。 */
  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.styleElement) {
      this.styleElement.remove();
    }
  }

  /** 依目前視窗大小建立漂浮動畫的 @keyframes。 */
  private generateDriftKeyframes(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const perimeter = 2 * (w + h);

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

    if (this.styleElement) {
      this.styleElement.remove();
    }

    this.styleElement = this.renderer.createElement('style');
    this.renderer.appendChild(this.styleElement, document.createTextNode(keyframe));
    this.renderer.appendChild(document.head, this.styleElement);
  }
}
