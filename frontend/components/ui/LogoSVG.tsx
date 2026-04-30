import * as React from "react"
import Svg, {
  SvgProps,
  Rect,
  Path,
  Circle,
} from "react-native-svg"
import { Colors } from "@/constants/Colors"
const LogoSVG = (props: SvgProps) => (
  <Svg width={100} height={100} viewBox="0 0 100 100" {...props}>
    <Rect width={80} height={80} x={10} y={10} fill={Colors.primary} rx={18} ry={18} />
    <Path stroke="#fff" strokeLinecap="round" strokeWidth={3} d="M50 75V45" />
    <Path fill="#fff" d="M50 58s-16-5-18-18c0 0 15-2 18 12" opacity={0.9} />
    <Path
      fill="#fff"
      d="M50 51c3-13 18-12 18-12-2 13-18 18-18 18"
      opacity={0.75}
    />
    <Circle cx={50} cy={41} r={4} fill="#fff" opacity={0.95} />
  </Svg>
)
export default LogoSVG
