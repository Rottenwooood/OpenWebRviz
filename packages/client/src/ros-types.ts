// Type definitions for ROS messages used in WebBot-Viz

/**
 * OccupancyGrid message structure
 * Used for rendering map data from /map topic
 */
export interface OccupancyGrid {
  header: {
    stamp: { sec: number; nsec: number };
    frame_id: string;
  };
  info: {
    map_load_time: { sec: number; nsec: number };
    resolution: number; // meters per cell
    width: number; // number of cells
    height: number; // number of cells
    origin: {
      position: { x: number; y: number; z: number };
      orientation: { x: number; y: number; z: number; w: number };
    };
  };
  data: number[]; // row-major, values 0-100, -1 for unknown
}

/**
 * LaserScan message structure
 * Used for rendering laser scan data from /scan topic
 */
export interface LaserScan {
  header: {
    stamp: { sec: number; nsec: number };
    frame_id: string;
  };
  angle_min: number; // starting angle of the scan
  angle_max: number; // ending angle of the scan
  angle_increment: number; // angular distance between measurements
  time_increment: number; // time between measurements
  scan_time: number; // time between scans
  range_min: number; // minimum range value
  range_max: number; // maximum range value
  ranges: number[]; // range measurements
  intensities: number[]; // intensity measurements
}

/**
 * NavPath message structure
 * Used for navigation plans from move_base
 */
export interface NavPath {
  header: {
    stamp: { sec: number; nsec: number };
    frame_id: string;
  };
  poses: {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
  }[];
}

/**
 * TransformStamped message structure
 * Used for TF data from /tf and /tf_static
 */
export interface TransformStamped {
  header: {
    stamp: { sec: number; nsec: number };
    frame_id: string; // parent frame
    child_frame_id: string; // child frame
  };
  transform: {
    translation: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
  };
}
