import { Canvas, Group, Image, matchFont, Text, useImage } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { cancelAnimation, Easing, Extrapolation, interpolate, runOnJS, useAnimatedReaction, useDerivedValue, useFrameCallback, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

const GRAVITY = 1000;
const JUMP_FORCE = -500;

const Index = () => {
  const {width, height} = useWindowDimensions();

  const bg = useImage(require("../../assets/sprites/background-day.png"));
  const bird = useImage(require("../../assets/sprites/bluebird-upflap.png"));
  const pipe = useImage(require("../../assets/sprites/pipe-red.png"));
  const pipeDownwards = useImage(require("../../assets/sprites/pipe-red-downwards.png"));
  const base = useImage(require("../../assets/sprites/base.png"));

  const pipeWidth = 104;
  const pipeHeight = 640;

  const fontFamily = Platform.select({ ios: 'Helvetica', android: 'sans-serif' });
  const fontStyle = {
    fontFamily,
    fontSize: 24,
    fontWeight: 'bold'
  };
  const font = matchFont(fontStyle);
  const fontStyleGameOver = {
    fontFamily,
    fontSize: 48,
    fontWeight: 'bold'
  };
  const fontGameOver = matchFont(fontStyleGameOver);

  const birdX = width / 4;

  const pipeX = useSharedValue(width); //Valor usado para mover los pipes, arranca desde el width y va corriendo hacia la izquierda (0).
  const birdY = useSharedValue(height / 3);
  const birdYVelocity = useSharedValue(0);
  const gameOver = useSharedValue(false);
  const score = useSharedValue(0);
  const pipeOffset = useSharedValue(0);
  const pipeSpeed = useDerivedValue(()=> {
    return interpolate(score.value, [0, 20], [1, 2])
  });
  const topPipeY = useDerivedValue(() => pipeOffset.value - 320);
  const bottomPipeY = useDerivedValue(() => height - 320 + pipeOffset.value);

  const scoreText = useDerivedValue(() => `Score: ${score.value}`);
  const gameOverText = useDerivedValue(() => gameOver.value ? "Game Over" : "");

  const obstacles = useDerivedValue(() => ([
    {x: pipeX.value, y: bottomPipeY.value, h: pipeHeight, w: pipeWidth},
    {x: pipeX.value, y: topPipeY.value, h: pipeHeight, w: pipeWidth}
  ]));

  const birdTransform = useDerivedValue(()=>{
    return [
      {rotate: interpolate(birdYVelocity.value, [-50, 50], [-0.5, 0.5], Extrapolation.CLAMP)}
    ];
  })
  
  const birdOrigin = useDerivedValue(()=>{
    return {x: width / 4 + 32, y: birdY.value + 24};
  })

  const moveMap = () => {
     pipeX.value = withSequence(
       withTiming(width, {duration:0}),
        withTiming(-150, {duration: 3000 / pipeSpeed.value, easing: Easing.linear}),
        withTiming(width, {duration:0}),
      );
  }

  const restartGame = () => {
    'worklet';
    birdY.value = height / 3;
    birdYVelocity.value = 0;
    pipeX.value = width;
    gameOver.value = false;
    score.value = 0;
    pipeOffset.value = Math.random() * 400 - 200;
    runOnJS(moveMap)();
  }

  const gesture = Gesture.Tap().onStart(()=>{
    if(gameOver.value){
      restartGame();
    }else{
      birdYVelocity.value = JUMP_FORCE;
    }
  })

  useFrameCallback(({timeSincePreviousFrame: dt}) => {
    if(!dt || gameOver.value) return;
    birdY.value = birdY.value + (birdYVelocity.value * dt ) / 1000
    birdYVelocity.value = birdYVelocity.value + (GRAVITY * dt) / 1000;
  });

  useEffect(()=>{
    moveMap();
  },[])

  //Scoring system
  useAnimatedReaction(() => pipeX.value, (currentValue, previousValue) => {
    const middle = birdX;
    if(previousValue && currentValue < -100 && previousValue > -100){
      pipeOffset.value = Math.random() * 400 - 200;
      cancelAnimation(pipeX);
      runOnJS(moveMap)();
    }

    if(currentValue != previousValue && previousValue && currentValue < middle && previousValue > middle){
      score.value = score.value + 1;
    }
  });

  const isPointCollidingWithRect = (point, rect) => {
    'worklet';
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    )
  }

  //Colision detection
  useAnimatedReaction(() => birdY.value, (currentValue, previousValue) => {
    const center = {
      x: birdX + 32,
      y: birdY.value + 24
    }

    //Ground collision detection
    if(currentValue > height - 120 || currentValue < 0){
      gameOver.value = true;
    } 

    const isColliding = obstacles.value.some((r)=> isPointCollidingWithRect(center, r))
    
    if(isColliding) gameOver.value = true;
  });

  useAnimatedReaction(() => gameOver.value, (currentValue, previousValue) => {
    if(currentValue && !previousValue){
      cancelAnimation(pipeX);
    } 
  });

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ width, height}}>
          <Image image={bg} width={width} height={height} fit={"cover"}/>

          {/* Top Pipe */}
          <Image image={pipeDownwards} y={topPipeY} x={pipeX} width={pipeWidth} height={pipeHeight}/>

          <Image image={pipe} y={bottomPipeY} x={pipeX} width={pipeWidth} height={pipeHeight}/>
          {/* Bottom Pipe */}

          <Group origin={birdOrigin} transform={birdTransform}>
            <Image image={bird} y={birdY} x={birdX} width={64} height={48}/>
          </Group>

          <Image image={base} y={height - 75} x={0} width={width} height={150} fit={"cover"}/>

          <Text y={100} x={16} text={scoreText} font={font}/>
          
          <Text y={height/3} x={width / 5} text={gameOverText} font={fontGameOver} color={"black"}/>
        </Canvas>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export default Index;