import * as cornerstoneTools from '@cornerstonejs/tools';

const {
  LengthTool,
  HeightTool,
  ProbeTool,
  RectangleROITool,
  EllipticalROITool,
  CircleROITool,
  BidirectionalTool,
  // AngleTool,
  CobbAngleTool,
  ArrowAnnotateTool,
  PlanarFreehandROITool,
  EraserTool,
  KeyImageTool,
  VideoRedactionTool,
} = cornerstoneTools;

const annotationTools = new Map();

annotationTools.set(LengthTool.toolName, {});
annotationTools.set(HeightTool.toolName, { tool: HeightTool });
annotationTools.set(ProbeTool.toolName, { tool: ProbeTool });
annotationTools.set(RectangleROITool.toolName, { tool: RectangleROITool });
annotationTools.set(EllipticalROITool.toolName, { tool: EllipticalROITool });
annotationTools.set(CircleROITool.toolName, { tool: CircleROITool });
annotationTools.set(BidirectionalTool.toolName, { tool: BidirectionalTool });
// annotationTools.set(AngleTool.name, { tool: AngleTool });
annotationTools.set(CobbAngleTool.toolName, { tool: CobbAngleTool });
annotationTools.set(ArrowAnnotateTool.toolName, { tool: ArrowAnnotateTool });
annotationTools.set(PlanarFreehandROITool.toolName, {
  tool: PlanarFreehandROITool,
  configuration: {
    calculateStats: true,
  },
});
annotationTools.set(EraserTool.toolName, { tool: EraserTool });
annotationTools.set(KeyImageTool.toolName, { tool: KeyImageTool });
annotationTools.set(VideoRedactionTool.toolName, { tool: VideoRedactionTool });

export default annotationTools;
