// piece-preview.js — 홀드·다음 블록 칸의 블록 그림(특수 칸 문양 축소 포함)만
// TASK-041 (D-03A 분할 — task-wall §3.4 #4-1, devguide L-17) | REQ-001 REQ-013 FR-003 FR-015 FR-035 FR-044 | ARCH-004 |
// API-020 `opponentState.hold` | SCR-005 HoldBox·NextQueue·OpponentHold | design-vision §2.3·§3.5.1·§3.5.2·§4.6.10 X-01
// 상자 테두리·"HOLD"·"NEXT" 글자는 DOM(D3-04). 여기서는 블록 그림만, 보드와 같은 구운 텍스처(§2.11)로.
import { Container, Sprite } from "pixi.js";
import { cellCode, pieceCells } from "../engine/piece.js";
import { BLOCK_SIZES } from "./block-textures.js";
import { specialOverlaySprite } from "./board-view.js";

const ASCENDING_SIZES = [...BLOCK_SIZES].sort((a, b) => a - b);

export class PiecePreview {
  /**
   * @param {{ textures: any, holdRect?: { x: number, y: number, w: number, h: number } | null,
   *   nextRect?: { x: number, y: number, w: number, h: number, first: number, rest: number } | null,
   *   maxCell: number, armorIcon?: (armorId: string) => any }} o 좌표 = layout.js BATTLE_GEOMETRY (가상 px)
   */
  constructor(o) {
    this.o = o;
    this.root = new Container({ label: "PiecePreview" });
  }

  /**
   * @param {{ type: string, special?: any } | null} hold
   * @param {boolean} holdUsable FR-003 홀드는 낙하당 1회 — 불가(같은 낙하 중 사용)면 투명도 0.4 (§3.5.1 홀드 상자 행)
   * @param {Array<{ type: string, special?: any }>} next rules.board.preview·previewSolomon·previewGabriel 개수
   */
  set(hold, holdUsable, next) {
    this.root.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    const { holdRect, nextRect } = this.o;
    if (holdRect && hold) {
      const p = this.piece(hold, holdRect.w, holdRect.h);
      p.position.set(holdRect.x + holdRect.w / 2, holdRect.y + holdRect.h / 2);
      p.alpha = holdUsable ? 1 : 0.4;
      this.root.addChild(p);
    }
    if (nextRect) {
      // §3.5.1 첫 칸 100×72, 이후 100×52 / §3.5.2 첫 칸 80×64, 이후 80×44
      let y = nextRect.y;
      next.forEach((n, i) => {
        const h = i === 0 ? nextRect.first : nextRect.rest;
        const p = this.piece(n, nextRect.w, h);
        p.position.set(nextRect.x + nextRect.w / 2, y + h / 2);
        this.root.addChild(p);
        y += h;
      });
    }
  }

  /**
   * 블록 1개 — 칸 크기 = min(폭·0.84/4, 높이·0.84/2, 보드 칸), 가운데 정렬. 구운 크기 중 그 이상인 가장 작은 것을 축소.
   * @param {{ type: string, special?: any }} entry @param {number} w @param {number} h
   */
  piece(entry, w, h) {
    const c = new Container();
    const cells = pieceCells({ type: entry.type, x: 0, y: 0, rot: 0 });
    const k = Math.min((w * 0.84) / 4, (h * 0.84) / 2, this.o.maxCell);
    const size = ASCENDING_SIZES.find((v) => v >= k) ?? ASCENDING_SIZES[ASCENDING_SIZES.length - 1];
    const code = cellCode(entry.type);
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
    cells.forEach(([x, y], i) => {
      const s = new Sprite(this.o.textures.block(code, size));
      s.anchor.set(0.5);
      s.scale.set(k / size);
      s.position.set((x + 0.5 - cx) * k, (y + 0.5 - cy) * k);
      c.addChild(s);
      // §2.3 "특수 칸 문양은 다음 블록 미리보기에도 같은 모양으로 축소 표시" (X-01)
      if (entry.special && entry.special.cellIndex === i) {
        const ov = specialOverlaySprite(this.o.textures, entry.special, size, this.o.armorIcon);
        if (ov) {
          ov.scale.set(k / size);
          ov.position.copyFrom(s.position);
          c.addChild(ov);
        }
      }
    });
    return c;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}
