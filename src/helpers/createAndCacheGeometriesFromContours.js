import { geometryLoader, Enums } from '@cornerstonejs/core';
const assetsURL = {
  "CircleContour": "https://ohif-assets.s3.us-east-2.amazonaws.com/cornerstone3D/segmentation/contour/Circle.json",
  "SampleContour": "https://ohif-assets.s3.us-east-2.amazonaws.com/cornerstone3D/segmentation/contour/Contour.json",
  "SurfaceLung13": "https://ohif-assets.s3.us-east-2.amazonaws.com/cornerstone3D/segmentation/surface/lung13.json",
  "SurfaceLung14": "https://ohif-assets.s3.us-east-2.amazonaws.com/cornerstone3D/segmentation/surface/lung14.json",
  "SurfaceLung15": "https://ohif-assets.s3.us-east-2.amazonaws.com/cornerstone3D/segmentation/surface/lung15.json",
  "SurfaceLung16": "https://ohif-assets.s3.us-east-2.amazonaws.com/cornerstone3D/segmentation/surface/lung16.json",
  "SurfaceLung17": "https://ohif-assets.s3.us-east-2.amazonaws.com/cornerstone3D/segmentation/surface/lung17.json",
  "Labelmap": "https://ohif-assets.s3.us-east-2.amazonaws.com/cornerstone3D/segmentation/labelmap/lung/labelMap.json"
};

/**
 * Creates and caches geometries from contours
 * @param contours - The contours data
 * @returns A Map of segment index to geometry ID
 */

export async function createAndCacheGeometriesFromContours(
  name
) {
  const data = await fetch(assetsURL[name]).then((res) => res.json());

  const geometryIds = [];
  data.contourSets.forEach((contourSet) => {
    const geometryId = contourSet.id;
    geometryIds.push(geometryId);
    return geometryLoader.createAndCacheGeometry(geometryId, {
      type: Enums.GeometryType.CONTOUR,
      geometryData: contourSet,
    });
  });

  return geometryIds;
}
