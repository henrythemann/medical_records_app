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

export default function downloadSurfaces() {
  const lung13Promise = fetch(assetsURL.SurfaceLung13).then((res) =>
    res.json()
  );
  const lung14Promise = fetch(assetsURL.SurfaceLung14).then((res) =>
    res.json()
  );
  const lung15Promise = fetch(assetsURL.SurfaceLung15).then((res) =>
    res.json()
  );
  const lung16Promise = fetch(assetsURL.SurfaceLung16).then((res) =>
    res.json()
  );
  const lung17Promise = fetch(assetsURL.SurfaceLung17).then((res) =>
    res.json()
  );

  return Promise.all([
    lung13Promise,
    lung14Promise,
    lung15Promise,
    lung16Promise,
    lung17Promise,
  ]);
}
