import {annualRisk} from './src/engines/model.mjs';
onmessage = ({data:{id,factor}}) => {
  postMessage({id,a:annualRisk(42,factor),b:annualRisk(2026,factor)});
};
