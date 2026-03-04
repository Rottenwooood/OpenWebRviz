import { describe, it, expect } from 'vitest';

describe('Utility functions', () => {
  it('should correctly convert quaternion to theta', () => {
    // Test case: identity quaternion should give 0 theta
    const q = { x: 0, y: 0, z: 0, w: 1 };
    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const theta = Math.atan2(siny_cosp, cosy_cosp);
    expect(theta).toBeCloseTo(0);
  });

  it('should correctly convert quaternion to 90 degree rotation', () => {
    // Test case: 90 degree rotation around z axis
    const q = { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 };
    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const theta = Math.atan2(siny_cosp, cosy_cosp);
    expect(theta).toBeCloseTo(Math.PI / 2);
  });

  it('should handle laser scan polar to cartesian conversion', () => {
    const range = 1.0;
    const angle = 0; // 0 radians
    const x = range * Math.cos(angle);
    const y = range * Math.sin(angle);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
  });

  it('should handle 45 degree angle', () => {
    const range = Math.SQRT2;
    const angle = Math.PI / 4; // 45 degrees
    const x = range * Math.cos(angle);
    const y = range * Math.sin(angle);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(1);
  });

  it('should clamp scale values', () => {
    const scale = 50;
    const delta = 0.9;
    const newScale = Math.max(5, Math.min(200, scale * delta));
    expect(newScale).toBe(45);
  });

  it('should clamp scale at minimum', () => {
    const scale = 5;
    const delta = 0.9;
    const newScale = Math.max(5, Math.min(200, scale * delta));
    expect(newScale).toBe(5);
  });

  it('should clamp scale at maximum', () => {
    const scale = 200;
    const delta = 1.1;
    const newScale = Math.max(5, Math.min(200, scale * delta));
    expect(newScale).toBe(200);
  });
});
