import * as React from "react"
import Svg, {
  SvgProps,
  Rect,
  Path,
  Circle,
  Text,
} from "react-native-svg"
const LogoSVG = (props: SvgProps) => (
  <Svg xmlns="http://www.w3.org/2000/svg" width={300} height={120} {...props}>
    <Rect width={96} height={96} x={10} y={12} fill="#2DD4BF" rx={22} ry={22} />
    <Path stroke="#fff" strokeLinecap="round" strokeWidth={3} d="M58 88V52" />
    <Path fill="#fff" d="M58 68s-20-6-22-22c0 0 18-2 22 14" opacity={0.9} />
    <Path
      fill="#fff"
      d="M58 60c4-16 22-14 22-14-2 16-22 22-22 22"
      opacity={0.75}
    />
    <Circle cx={58} cy={48} r={5} fill="#fff" opacity={0.95} />
  </Svg>
)
export default LogoSVG
