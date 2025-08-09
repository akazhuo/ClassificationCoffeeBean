
class Model {
  name: string;
  predict(): object;
}

type Color = {
  [key: string]: string;
  Dark: string;
  Light: string;
  Medium: string;
  Green: string;
}

export { Model, Color };
