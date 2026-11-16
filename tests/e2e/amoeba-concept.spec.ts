import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('amoeba concept uses the same rendered eye size as the paramecium', async ({ page }) => {
  const concepts = [
    'docs/art/paramecium-concept.svg',
    'docs/art/amoeba-concept.svg',
  ];
  const eyeBounds = [];

  for (const concept of concepts) {
    await page.goto(pathToFileURL(resolve(concept)).href);
    await expect(page.locator('#eye')).toBeVisible();
    eyeBounds.push(await page.locator('#eye').evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    }));
  }
    const vacuolesStayInside = await page.locator('#body-shape').evaluate(shape => {
      const bodyShape = shape as SVGGeometryElement;
      const svg = bodyShape.ownerSVGElement!;
      return Array.from(svg.querySelectorAll('[data-vacuole]')).every(circle => {
        const vacuole = circle as SVGCircleElement;
        const radius = Number(vacuole.getAttribute('r')) + Number(vacuole.getAttribute('stroke-width') ?? 9) / 2 + 1;
        const cx = Number(vacuole.getAttribute('cx'));
        const cy = Number(vacuole.getAttribute('cy'));
        return Array.from({ length: 24 }, (_, index) => {
          const angle = index * Math.PI * 2 / 24;
          const point = svg.createSVGPoint();
          point.x = cx + Math.cos(angle) * radius;
          point.y = cy + Math.sin(angle) * radius;
          return bodyShape.isPointInFill(point);
        }).every(Boolean);
      });
    });
    expect(vacuolesStayInside).toBe(true);
    await expect(page.locator('#body-highlight')).toHaveAttribute('clip-path', 'url(#body-highlight-clip)');

  expect(Math.abs(eyeBounds[1]!.width - eyeBounds[0]!.width)).toBeLessThan(0.001);
  expect(Math.abs(eyeBounds[1]!.height - eyeBounds[0]!.height)).toBeLessThan(0.001);
  await expect(page.locator('#body-shape')).toHaveAttribute('fill', '#f4c84c');
  await expect(page.locator('#body-shape')).toHaveAttribute('stroke', '#111111');
  await expect(page.locator('#eyebrow')).toHaveAttribute('fill', '#111111');
  await expect(page.locator('#eyebrow')).toHaveAttribute('x', '279.375');
  await expect(page.locator('#eyebrow')).toHaveAttribute('y', '127.25');
  await expect(page.locator('#eyebrow')).toHaveAttribute('width', '161.25');
  await expect(page.locator('#eyebrow')).toHaveAttribute('height', '52.5');
  await expect(page.locator('#eyebrow')).toHaveAttribute('rx', '10');
  const browTouchesEye = await page.evaluate(() => {
    const brow = document.querySelector('#eyebrow') as SVGRectElement;
    const eye = document.querySelector('#eye') as SVGGElement;
    const eyeBounds = eye.getBBox();
    const eyeTransform = eye.transform.baseVal.consolidate()!.matrix;
    const strokeWidth = Number(eye.getAttribute('stroke-width')) * eyeTransform.a;
    const eyeTopIncludingStroke = eyeTransform.d * eyeBounds.y + eyeTransform.f - strokeWidth / 2;
    const browCenterY = Number(brow.getAttribute('y')) + Number(brow.getAttribute('height')) / 2;
    return Math.abs(browCenterY - eyeTopIncludingStroke) < 0.1;
  });
  expect(browTouchesEye).toBe(true);
  const eyeIsContained = await page.locator('#body-shape').evaluate(shape => {
    const bodyShape = shape as SVGGeometryElement;
    const svg = bodyShape.ownerSVGElement!;
    return Array.from({ length: 32 }, (_, index) => {
      const angle = index * Math.PI * 2 / 32;
      const point = svg.createSVGPoint();
      point.x = 360 + Math.cos(angle) * 107;
      point.y = 260 + Math.sin(angle) * 107;
      return bodyShape.isPointInFill(point);
    }).every(Boolean);
  });
  expect(eyeIsContained).toBe(true);
  const bodyPathSmoothAtTop = await page.locator('#body-shape').evaluate(shape => {
    const path = shape as SVGGeometryElement;
    const length = path.getTotalLength();
    const before = path.getPointAtLength(length - 0.1);
    const start = path.getPointAtLength(0);
    const after = path.getPointAtLength(0.1);
    const incoming = Math.atan2(start.y - before.y, start.x - before.x);
    const outgoing = Math.atan2(after.y - start.y, after.x - start.x);
    return Math.abs(Math.atan2(Math.sin(incoming - outgoing), Math.cos(incoming - outgoing)));
  });
  expect(bodyPathSmoothAtTop).toBeLessThan(0.15);
  const glintClearance = await page.evaluate(() => {
    const vacuole = document.querySelector('#large-vacuole') as SVGGeometryElement;
    const glint = document.querySelector('#vacuole-glint') as SVGCircleElement;
    const center = { x: Number(glint.getAttribute('cx')), y: Number(glint.getAttribute('cy')) };
    const radius = Number(glint.getAttribute('r'));
    const outline = Array.from({ length: 256 }, (_, index) => {
      const point = vacuole.getPointAtLength(vacuole.getTotalLength() * index / 256);
      return Math.hypot(point.x - center.x, point.y - center.y);
    });
    return Math.min(...outline) - radius;
  });
  expect(glintClearance).toBeGreaterThan(8);
  const highlightClippedToBody = await page.locator('#body-highlight').getAttribute('clip-path');
  expect(highlightClippedToBody).toBe('url(#body-highlight-clip)');
});