var particleSystem = {
  allSystems: [],
  createNew: function (canvas, dim) {
    for (var i = 0; i < this.allSystems.length; i++) {
      if (this.allSystems[i].canvas == canvas) {
        console.error(
          "more than 1 particle systems can not render to the same canvas"
        );
        return;
      }
    }
    const methods = Object.assign({}, this.particle);
    const length = this.allSystems.length;
    methods.system = length;
    let ctx = canvas.getContext("2d");
    this.allSystems.push({
      c: ctx,
      canvas: canvas,
      dim: dim,
      particles: [],
      groups: [],
      methods: methods
    });
    return this.allSystems[this.allSystems.length - 1].methods;
  },
  particle: {
    floor: undefined,
    system: undefined,
    rendering: false,
    gravity: 1,
    airResistance: 0.05,
    loop: undefined,
    friction: 0.001,
    cam: { x: 0, y: 0, z: 0 },
    frameRate: 30,
    timeout: undefined,
    specifiedFrameRate: 30,
    globalFade: 0,
    clip: {
      fade: true,
      offScreen: false,
      colition: false,
      zDistance: undefined,
      timeout: false
    },

    createParticle: function () {
      var system = particleSystem.allSystems[this.system];
      if (system.dim == 2) {
        if (arguments.length !== 7) {
          console.error(
            "To create 2D particle, there must be 7 arguments present (x,y,xv,yv,radius,color,gravity) only " +
              arguments.length +
              " present."
          );
        } else {
          if (arguments[5].includes("(")) {
            system.particles.push({
              x: arguments[0],
              y: arguments[1],
              xv: arguments[2],
              yv: arguments[3],
              rad: arguments[4],
              color: arguments[5],
              gravity: arguments[6],
              alpha: 1,
              timeStamp: new Date(),
              colition: false
            });
          } else {
            console.error(
              "particle system error: can not support HTML colors (" +
                arguments[5] +
                ")"
            );
          }
        }
      } else if (system.dim == 3) {
        if (arguments.length !== 9) {
          console.error(
            "To create 3D particle, there must be 9 arguments present (x,y,z,xv,yv,zv,radius,color,gravity) only " +
              arguments.length +
              " present."
          );
        } else if (!arguments[7].includes("(")) {
          console.error(
            "particle system error: can not support HTML colors (" +
              arguments[7] +
              ")"
          );
        } else {
          system.particles.push({
            x: arguments[0],
            y: arguments[1],
            z: arguments[2] / 600 + 1,
            xv: arguments[3],
            yv: arguments[4],
            zv: arguments[5] / 600,
            rad: arguments[6],
            color: arguments[7],
            gravity: arguments[8],
            alpha: 1,
            timeStamp: new Date(),
            colition: false
          });
        }
      }
    },
    findMinIn: function (array, invalidations) {
      var min = -Infinity,
        minI;
      for (var i = 0; i < array.length; i++) {
        if (array[i].z > min && !invalidations.includes(i)) {
          min = array[i].z;
          minI = i;
        }
      }
      //	console.log(minI)
      return minI;
    },
    render2D: function () {
      var system = particleSystem.allSystems[this.system],
        currentParticle,
        color;
      for (var i = 0; i < system.particles.length; i++) {
        currentParticle = system.particles[i];
        system.c.beginPath();
        color =
          currentParticle.color.split("(")[0] +
          "a(" +
          currentParticle.color.split("(")[1].split(")")[0] +
          "," +
          currentParticle.alpha +
          ")";
        system.c.fillStyle = color;
        system.c.arc(
          currentParticle.x - this.cam.x + system.canvas.clientWidth / 2,
          currentParticle.y - this.cam.y + system.canvas.clientHeight / 2,
          currentParticle.rad,
          0,
          Math.PI * 2
        );
        system.c.fill();
      }
    },
    orderArray: function (array, callBack) {
      //	console.log(array.length)
      var ordered = [],
        thisMin,
        invalidations = [];
      array.forEach((item, i) => {
        thisMin = this.findMinIn(array, invalidations);
        //		console.log(thisMin)
        //console.log(thisMin)
        if (thisMin !== undefined) {
          invalidations.push(thisMin);
        }
        ordered.push(thisMin);
      });
      return ordered;
    },
    render3D: function () {
      var system = particleSystem.allSystems[this.system],
        currentParticle,
        color;
      var ordered = this.orderArray(system.particles);
      //console.log(system.particles.length)
      for (var i = 0; i < system.particles.length; i++) {
        currentParticle = system.particles[ordered[i]];
        system.c.beginPath();
        color =
          currentParticle.color.split("(")[0] +
          "a(" +
          currentParticle.color.split("(")[1].split(")")[0] +
          "," +
          currentParticle.alpha +
          ")";
        system.c.fillStyle = color;
        if (currentParticle.z - system.methods.cam.z / 600 > 0) {
          system.c.arc(
            (currentParticle.x - system.methods.cam.x) /
              (currentParticle.z - system.methods.cam.z / 600) +
              system.canvas.clientWidth / 2,
            (currentParticle.y - system.methods.cam.y) /
              (currentParticle.z - system.methods.cam.z / 600) +
              system.canvas.clientHeight / 2,
            currentParticle.rad /
              (currentParticle.z - system.methods.cam.z / 600),
            0,
            Math.PI * 2
          );
        }
        system.c.fill();
      }
    },
    update2D: function () {
      var system = particleSystem.allSystems[this.system],
        currentParticle;
      for (var i = system.particles.length - 1; i >= 0; i--) {
        currentParticle = system.particles[i];
        currentParticle.x += currentParticle.xv / this.frameRate;
        currentParticle.y += currentParticle.yv / this.frameRate;
        currentParticle.xv /= this.airResistance / this.frameRate + 1;
        currentParticle.yv /= this.airResistance / this.frameRate + 1;
        currentParticle.alpha -= this.globalFade / this.frameRate;
        if (this.floor !== undefined && currentParticle.y > this.floor) {
          currentParticle.yv /= (this.friction + 1) * -1;
          currentParticle.colition = true;
          //currentParticle.y+=currentParticle.yv/(this.frameRate)*(this.friction+1)
        } else if (currentParticle.gravity) {
          currentParticle.yv += (this.gravity / this.frameRate) * 8;
        }
        this.removeParticle(currentParticle, system.particles, i, false);
      }
    },
    update3D: function () {
      var system = particleSystem.allSystems[this.system],
        currentParticle;
      for (var i = system.particles.length - 1; i >= 0; i--) {
        currentParticle = system.particles[i];
        currentParticle.x += currentParticle.xv / this.frameRate;
        currentParticle.z += currentParticle.zv / this.frameRate;
        currentParticle.y += currentParticle.yv / this.frameRate;
        currentParticle.zv /= this.airResistance / this.frameRate + 1;
        currentParticle.xv /= this.airResistance / this.frameRate + 1;
        currentParticle.yv /= this.airResistance / this.frameRate + 1;

        currentParticle.alpha -= this.globalFade / this.frameRate;
        if (
          this.floor !== undefined &&
          currentParticle.y > this.floor / currentParticle.z
        ) {
          currentParticle.yv /= (this.friction / 1 + 1) * -1;
          //currentParticle.yv/=-1
          currentParticle.colition = true;
          if (Math.abs(currentParticle.yv) >= 10) {
            currentParticle.y += currentParticle.yv / this.frameRate;
          }
        } else if (currentParticle.gravity) {
          currentParticle.yv += this.gravity / this.frameRate;
        }
        this.removeParticle(currentParticle, system.particles, i, false);
      }
    },
    singleFrame: function (object) {
      if (object == undefined || object == null) {
        this.frameRate = this.specifiedFrameRate;
      }
      if (object == undefined || object == null) {
        particleSystem.allSystems[this.system].c.clearRect(
          0,
          0,
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight
        );
        var system = particleSystem.allSystems[this.system];
        if (particleSystem.allSystems[this.system].dim == 2) {
          this.update2D();
          this.render2D();
          for (var i = 0; i < system.groups.length; i++) {
            if (!system.groups[i].preProcess.active) {
              this.update2DGroup(system.groups[i]);
              this.render2DGroup(system.groups[i]);
            }
          }
        } else {
          this.update3D();
          this.render3D();
          for (var i = 0; i < system.groups.length; i++) {
            if (!system.groups[i].preProcess.active) {
              this.update3DGroup(system.groups[i]);
              this.render3DGroup(system.groups[i]);
            }
          }
        }
        for (var i = 0; i < system.groups.length; i++) {
          if (system.groups[i].preProcess.playing) {
            this.doSavedFrame(system.groups[i], system);
          }
        }
      } else {
        particleSystem.allSystems[object.system].c.clearRect(
          0,
          0,
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight
        );
        var system = particleSystem.allSystems[object.system];
        if (particleSystem.allSystems[object.system].dim == 2) {
          object.update2D();
          object.render2D();
          for (var i = 0; i < system.groups.length; i++) {
            if (!system.groups[i].preProcess.active) {
              object.update2DGroup(system.groups[i]);
              object.render2DGroup(system.groups[i]);
            }
          }
        } else {
          object.update3D();
          object.render3D();
          for (var i = 0; i < system.groups.length; i++) {
            if (!system.groups[i].preProcess.active) {
              object.update3DGroup(system.groups[i]);
              object.render3DGroup(system.groups[i]);
            }
          }
        }
        for (var i = 0; i < system.groups.length; i++) {
          if (system.groups[i].preProcess.playing) {
            object.doSavedFrame(system.groups[i], system);
          }
        }
      }
    },
    loopFrames: function (rate) {
      var object = this;
      this.rendering = true;
      this.frameRate = rate / 8;
      this.loop = setInterval(function () {
        object.singleFrame(object);
      }, 1000 / rate);
    },
    createGroup: function () {
      function removeChar(char, string) {
        let str = string;
        str = str.split(char);

        return str.join("");
      }

      var system = particleSystem.allSystems[this.system];
      var particles = [],
        force,
        angle,
        xv,
        yv;
      if (system.dim == 2) {
        //x,y,dir,focusAngle,force,randomForceFactor,color,randomColorFactor,rad,randomRadiusFactor, amount,gravity
        if (arguments.length !== 12) {
          console.error(
            "you can only create a new 2D group with 12 arguments present (x,y,dir,focus, force, randomForce, color,randomColor,particleRadius,randomRadius,amount,gravity) only " +
              arguments.length +
              " present"
          );
        } else {
          var force, angle, xy, yv, color, splitColor;
          if (arguments[6].split("(")[0] !== "hsl" && arguments[7] !== 0) {
            console.error(
              "particle system error: can only introduce random color into hsl colors not (" +
                arguments[6].split("(")[0] +
                ")"
            );
          } else if (!arguments[6].includes("(")) {
            console.error("HTML colors are not supported");
          } else {
            for (var i = 0; i < arguments[10]; i++) {
              force =
                arguments[4] +
                (Math.random() * arguments[5] * 2 - arguments[5] / 2);
              angle = arguments[2] + Math.random() * arguments[3];
              xv = Math.sin(angle * 0.0174533) * force;
              yv = Math.cos(angle * 0.0174533) * force;
              if (arguments[7] == 0) {
                color = arguments[6];
              } else {
                arguments[6] = removeChar("%", arguments[6]);
                splitColor = arguments[6]
                  .split("hsl(")[1]
                  .split(")")[0]
                  .split(",");

                splitColor[0] = Number(splitColor[0]);
                splitColor[1] = Number(splitColor[1]);
                splitColor[2] = Number(splitColor[2]);
                color =
                  "hsl(" +
                  (splitColor[0] +
                    3.6 * (Math.random() * arguments[7] - arguments[7] / 2)) +
                  "," +
                  (splitColor[1] +
                    (Math.random() * arguments[7] - arguments[7] / 2)) +
                  "%," +
                  (splitColor[2] +
                    (Math.random() * arguments[7] - arguments[7] / 2)) +
                  "%)";
              }

              particles.push({
                x: arguments[0],
                y: arguments[1],
                xv: xv,
                yv: yv,
                rad: arguments[8] + Math.random() * arguments[9],
                color: color,
                gravity: arguments[11],
                alpha: 1,
                timeStamp: new Date(),
                colition: false
              });
            }
            var play = this.playGroup;
            var localCanvas = document.createElement("canvas"),
              startProcess = this.startPreProcess,
              endProcess = this.endPreProcess,
              playProcess = this.playPreProcess;
            var returnObject = {
              particles: particles,
              play: function () {
                play(this, system);
              },
              glowParticles: [],
              fade: 0,
              glow: undefined,
              orginParticleCount: "auto",
              glowType: "all",
              drag: 1,
              arguments: arguments,
              explosionSize: 1,
              preProcess: {
                canvas: localCanvas,
                ctx: localCanvas.getContext("2d"),
                start: function () {
                  startProcess(this);
                },
                stop: function () {
                  endProcess(this);
                },
                play: function () {
                  playProcess(this, system);
                },
                time: 0,
                frames: 0,
                particlesLeft: undefined,
                active: false,
                loop: undefined,
                playing: false,
                playIndex: 0,
                images: []
              }
            };
            returnObject.preProcess.start = function () {
              startProcess(returnObject, system.methods);
            };
            returnObject.preProcess.stop = function () {
              endProcess(returnObject);
            };
            returnObject.preProcess.play = function () {
              playProcess(returnObject, system);
            };
            return returnObject;
          }
        }
      } else {
        //x,y,z,Xdir,Ydir,Xfocus,Yfocus,force,randomForceFactor,color,randomColorFactor,rad,randomRadiusFactor, amount,gravity
        if (arguments.length !== 15) {
          console.error(
            "can only create new  3D group with 15 arguments present (x,y,z,xDir,yDir,Xfocus,Yfocus,force,randomForce,color,randomColor,particleRadius,randomRadius,amount,gravity) only " +
              arguments.length +
              " present"
          );
        } else {
          var force, Xangle, Yangle, xy, yv, zv, color, splitColor;
          if (arguments[9].split("(")[0] !== "hsl" && arguments[10] !== 0) {
            console.error(
              "particle system error: can only introduce random color into hsl colors not (" +
                arguments[6].split("(")[0] +
                ")"
            );
          } else if (!arguments[9].includes("(")) {
            console.error("HTML colors are not supported");
          } else {
            for (var i = 0; i < arguments[13]; i++) {
              force =
                arguments[7] +
                (Math.random() * arguments[8] * 2 - arguments[7] / 2);
              Xangle = arguments[3] + Math.random() * arguments[5];
              Yangle = arguments[4] + Math.random() * arguments[6];
              xv =
                Math.sin(Xangle * 0.0174533) *
                Math.sin(Yangle * 0.0174533) *
                force;
              yv =
                Math.cos(Xangle * 0.0174533) *
                Math.sin(Yangle * 0.0174533) *
                force;
              zv = Math.cos(Yangle * 0.0174533) * force;
              if (arguments[10] == 0) {
                color = arguments[9];
              } else {
                arguments[9] = removeChar("%", arguments[9]);
                splitColor = arguments[9]
                  .split("hsl(")[1]
                  .split(")")[0]
                  .split(",");

                splitColor[0] = Number(splitColor[0]);
                splitColor[1] = Number(splitColor[1]);
                splitColor[2] = Number(splitColor[2]);
                color =
                  "hsl(" +
                  (splitColor[0] +
                    3.6 * (Math.random() * arguments[10] - arguments[10] / 2)) +
                  "," +
                  (splitColor[1] +
                    (Math.random() * arguments[10] - arguments[10] / 2)) +
                  "%," +
                  (splitColor[2] +
                    (Math.random() * arguments[10] - arguments[10] / 2)) +
                  "%)";
              }
              particles.push({
                x: arguments[0],
                y: arguments[1],
                z: arguments[2] / 600 + 1,
                xv: xv,
                yv: yv,
                zv: zv / 600,
                rad: arguments[11] + Math.random() * arguments[12],
                color: color,
                gravity: arguments[14],
                alpha: 1,
                timeStamp: new Date(),
                colition: false
              });
            }
            var play = this.playGroup;

            var localCanvas = document.createElement("canvas"),
              startProcess = this.startPreProcess,
              endProcess = this.endPreProcess,
              playProcess = this.playPreProcess;
            var returnObject = {
              particles: particles,
              play: function () {
                play(this, system);
              },
              glowParticles: [],
              fade: 0,
              glow: undefined,
              glowType: "all",
              originParticleCount: "auto",
              drag: 1,
              arguments: arguments,
              explosionSize: 1,
              preProcess: {
                canvas: localCanvas,
                ctx: localCanvas.getContext("2d"),
                start: function () {
                  startProcess(this);
                },
                stop: function () {
                  endProcess(this);
                },
                play: function () {
                  playProcess(this, system);
                },
                time: 0,
                frames: 0,
                procesing: false,
                particlesLeft: undefined,
                active: false,
                loop: undefined,
                playing: false,
                playIndex: 0,
                images: []
              }
            };

            returnObject.preProcess.start = function () {
              startProcess(returnObject, system.methods);
            };
            returnObject.preProcess.stop = function () {
              endProcess(returnObject);
            };
            returnObject.preProcess.play = function () {
              playProcess(returnObject, system);
            };
            return returnObject;
          }
        }
      }
    },
    startPreProcess: function (group, object) {
      group.preProcess.active = true;
      group.preProcess.procesing = true;
      var outerSystem = particleSystem.allSystems[object.system];
      object.playGroup(group, outerSystem);
      var loop = object.loopPreProcess,
        frameRate = object.frameRate;
      group.preProcess.loop = setInterval(function () {
        loop(group, object);
      }, frameRate);
    },
    endPreProcess: function (group) {
      group.preProcess.procesing = false;
      clearInterval(group.preProcess.loop);
    },

    loopPreProcess: function (group, object) {
      var system = particleSystem.allSystems[object.system];
      if (system.dim == 2) {
        object.update2DGroup(group);
        object.render2DGroup(group);
      } else {
        object.update3DGroup(group);
        object.render3DGroup(group);
      }
    },
    playPreProcess: function (group, system) {
      if (!group.preProcess.procesing) {
        if (system.methods.rendering) {
          for (var i = 0; i < group.preProcess.images.length; i++) {
            const image = new Image();
            const index = i;
            image.src = group.preProcess.images[index];
            image.onload = function () {
              group.preProcess.images[index] = image;
            };
          }
          setTimeout(function () {
            group.preProcess.playing = true;
          }, 100);
          group.preProcess.playIndex = 0;
        } else {
          console.warn(
            "This animation may not render because there is no internal rendering loop currently running. Initiate one with system.loopFrames(frameRate)"
          );
        }
      } else {
        console.error(
          "could not play animation since it is still pre-processing"
        );
      }
    },
    doSavedFrame: function (group, system) {
      var image = group.preProcess.images[group.preProcess.playIndex];

      if (group.preProcess.playIndex > group.preProcess.images.length - 1) {
        group.preProcess.playing = false;
      } else {
        system.c.drawImage(
          image,
          0,
          0,
          system.canvas.width,
          system.canvas.height
        );
        group.preProcess.playIndex++;
      }
    },
    playGroup: function (data, system) {
      var outerSystem = particleSystem.allSystems[system.methods.system];
      if (data.glow !== undefined) {
        if (system.dim == 2) {
          system.methods.initiateGlow2D(data);
        } else {
          system.methods.initiateGlow3D(data);
        }
      } else {
        data.glowParticles = [];
      }
      system.groups.push(data);
    },
    initiateGlow2D: function (groupData) {
      var singleParticle, nMax;
      if (groupData.glowType == "all" || groupData.glowType == "flare") {
        for (var i = 0; i < groupData.particles.length; i++) {
          nMax = Math.random() * groupData.glow + 1;
          for (var n = 0; n < nMax - 1; n++) {
            singleParticle = {
              x: groupData.particles[i].x,
              y: groupData.particles[i].y,
              xv: undefined,
              yv: undefined,
              offX: Math.random() * 15 - 7.5,
              offY: Math.random() * 15 - 7.5,
              rad:
                groupData.particles[i].rad *
                (Math.random() * 3 + 1.1) *
                groupData.explosionSize,
              alpha: 1 - Math.random(),
              alphaFade: (Math.random() / 20) * groupData.fade + 0.01,
              index: i,
              drag: Math.random() * 0.5 + 1 * groupData.drag,
              color: groupData.particles[i].color,
              type: 0,
              deleted: false
            };
            if (groupData.fade == undefined || groupData.fade == 0) {
              singleParticle.alphaFade = 0;
            }
            groupData.glowParticles.push(singleParticle);
          }
        }
      }
      var angle, force;
      if (groupData.glowType == "all" || groupData.glowType == "origin") {
        if (groupData.originParticleCount == "auto") {
          var amount =
            Math.random() * (groupData.explosionSize * 4) +
            groupData.explosionSize * 2;
        } else {
          var amount =
            Math.random() * (groupData.originParticleCount * 4) +
            groupData.originParticleCount * 2;
        }

        for (var n = 0; n < amount; n++) {
          angle =
            groupData.arguments[2] + Math.random() * groupData.arguments[3];
          force = groupData.explosionSize * 2;
          singleParticle = {
            x:
              groupData.particles[0].x +
              Math.random() * groupData.explosionSize * 20,
            y:
              groupData.particles[0].y +
              Math.random() * groupData.explosionSize * 20,
            xv: Math.sin(angle * 0.0174533) * force,
            yv: Math.cos(angle * 0.0174533) * force,
            rad: 4 * (Math.random() * 3 + 1.1) * groupData.explosionSize * 1.5,
            alpha: 1 - Math.random() / 2,
            alphaFade: 0.02 + (Math.random() / 30) * groupData.fade,
            color:
              groupData.particles[
                Math.floor(Math.random() * groupData.particles.length)
              ].color,
            type: 1
          };
          groupData.glowParticles.push(singleParticle);
        }
      }
    },
    initiateGlow3D: function (groupData) {
      var singleParticle, nMax;
      if (groupData.glowType == "all" || groupData.glowType == "flare") {
        for (var i = 0; i < groupData.particles.length; i++) {
          nMax = Math.random() * groupData.glow + 1;
          for (var n = 0; n < nMax - 1; n++) {
            singleParticle = {
              x: groupData.particles[i].x,
              y: groupData.particles[i].y,
              z: groupData.particles[i].z,
              xv: undefined,
              yv: undefined,
              zv: undefined,
              offX: Math.random() * 15 - 7.5,
              offY: Math.random() * 15 - 7.5,
              offZ: (Math.random() * 15 - 7.5) / 600,
              rad:
                groupData.particles[i].rad *
                (Math.random() * 3 + 1.1) *
                groupData.explosionSize,
              alpha: 1 - Math.random(),
              alphaFade: (Math.random() / 20) * groupData.fade + 0.01,
              index: i,
              drag: Math.random() * 0.5 + 1 * groupData.drag,
              color: groupData.particles[i].color,
              type: 0,
              deleted: false
            };
            if (groupData.fade == undefined || groupData.fade == 0) {
              singleParticle.alphaFade = 0;
            }
            groupData.glowParticles.push(singleParticle);
          }
        }
      }
      var angle1, angle2, force;

      if (groupData.glowType == "all" || groupData.glowType == "origin") {
        if (groupData.originParticleCount == "auto") {
          var amount =
            Math.random() * (groupData.explosionSize * 4) +
            groupData.explosionSize * 2;
        } else {
          var amount =
            Math.random() * (groupData.originParticleCount * 4) +
            groupData.originParticleCount * 2;
        }

        for (var n = 0; n < amount; n++) {
          angle1 =
            groupData.arguments[3] + Math.random() * groupData.arguments[5];
          angle2 =
            groupData.arguments[4] + Math.random() * groupData.arguments[6];
          force = groupData.explosionSize * 2;
          singleParticle = {
            x:
              groupData.particles[0].x +
              Math.random() * groupData.explosionSize * 20,
            y:
              groupData.particles[0].y +
              Math.random() * groupData.explosionSize * 20,
            z:
              groupData.particles[0].z +
              (Math.random() * groupData.explosionSize * 20) / 600,
            xv:
              Math.sin(angle1 * 0.0174533) *
              Math.sin(angle2 * 0.0174533) *
              force,
            yv:
              Math.cos(angle1 * 0.0174533) *
              Math.sin(angle2 * 0.0174533) *
              force,
            zv: (Math.cos(angle2 * 0.0174533) * force) / 600,
            rad: 4 * (Math.random() * 3 + 1.1) * groupData.explosionSize * 1.5,
            alpha: 1 - Math.random() / 2,
            alphaFade: 0.02 + (Math.random() / 30) * groupData.fade,
            color:
              groupData.particles[
                Math.floor(Math.random() * groupData.particles.length)
              ].color,
            type: 1
          };
          groupData.glowParticles.push(singleParticle);
        }
      }
    },
    render2DGroup: function (groupData) {
      var color;
      var system = particleSystem.allSystems[this.system],
        currentParticle;
      var canvas;
      if (groupData.preProcess.active) {
        canvas = groupData.preProcess.ctx;
        groupData.preProcess.canvas.width = system.canvas.width;
        groupData.preProcess.canvas.height = system.canvas.height;

        //console.log(groupData.preProcess.canvas.width)
        canvas.clearRect(
          0,
          0,
          groupData.preProcess.canvas.width,
          groupData.preProcess.canvas.height
        );
      } else {
        canvas = system.c;
      } //console.log(canvas.canvas)
      for (var i = 0; i < groupData.particles.length; i++) {
        currentParticle = groupData.particles[i];
        canvas.beginPath();
        color =
          currentParticle.color.split("(")[0] +
          "a(" +
          currentParticle.color.split("(")[1].split(")")[0] +
          "," +
          currentParticle.alpha +
          ")";
        canvas.fillStyle = color;
        //	console.log('a')
        canvas.arc(
          currentParticle.x - this.cam.x + system.canvas.clientWidth / 2,
          currentParticle.y - this.cam.y + system.canvas.clientHeight / 2,
          currentParticle.rad,
          0,
          Math.PI * 2
        );
        canvas.fill();
      }

      for (var i = 0; i < groupData.glowParticles.length; i++) {
        currentParticle = groupData.glowParticles[i];
        if (currentParticle.type == 0) {
          canvas.beginPath();
          color =
            currentParticle.color.split("(")[0] +
            "a(" +
            currentParticle.color.split("(")[1].split(")")[0] +
            "," +
            currentParticle.alpha +
            ")";
          canvas.fillStyle = color;
          canvas.arc(
            currentParticle.x -
              this.cam.x +
              currentParticle.offX +
              system.canvas.clientWidth / 2,
            currentParticle.y -
              this.cam.y +
              currentParticle.offY +
              system.canvas.clientHeight / 2,
            currentParticle.rad,
            0,
            Math.PI * 2
          );
          canvas.fill();
        } else {
          canvas.beginPath();
          color =
            currentParticle.color.split("(")[0] +
            "a(" +
            currentParticle.color.split("(")[1].split(")")[0] +
            "," +
            currentParticle.alpha +
            ")";
          canvas.fillStyle = color;
          canvas.arc(
            currentParticle.x - this.cam.x + system.canvas.clientWidth / 2,
            currentParticle.y - this.cam.y + system.canvas.clientHeight / 2,
            currentParticle.rad,
            0,
            Math.PI * 2
          );
          canvas.fill();
        }
      }
      if (groupData.preProcess.active) {
        groupData.preProcess.frames++;
        groupData.preProcess.time =
          groupData.preProcess.frames * (1 / this.frameRate);
        groupData.preProcess.particlesLeft =
          groupData.particles.length + groupData.glowParticles.length;
        var image = groupData.preProcess.canvas.toDataURL();

        groupData.preProcess.images.push(image);
      }
    },
    render3DGroup: function (groupData) {
      var color;
      var system = particleSystem.allSystems[this.system],
        currentParticle;
      var canvas;
      if (groupData.preProcess.active) {
        canvas = groupData.preProcess.ctx;
        groupData.preProcess.canvas.width = system.canvas.width;
        groupData.preProcess.canvas.height = system.canvas.height;

        //console.log(groupData.preProcess.canvas.width)
        canvas.clearRect(
          0,
          0,
          groupData.preProcess.canvas.width,
          groupData.preProcess.canvas.height
        );
      } else {
        canvas = system.c;
      }
      var ordered = this.orderArray(groupData.particles);
      for (var i = 0; i < groupData.particles.length; i++) {
        currentParticle = groupData.particles[ordered[i]];
        canvas.beginPath();
        color =
          currentParticle.color.split("(")[0] +
          "a(" +
          currentParticle.color.split("(")[1].split(")")[0] +
          "," +
          currentParticle.alpha +
          ")";
        canvas.fillStyle = color;
        if (currentParticle.z - this.cam.z / 600 > 0) {
          //console.log(currentParticle.rad/(currentParticle.z-this.cam.z))
          canvas.arc(
            (currentParticle.x - this.cam.x) /
              (currentParticle.z - this.cam.z / 600) +
              system.canvas.clientWidth / 2,
            (currentParticle.y - this.cam.y) /
              (currentParticle.z - this.cam.z / 600) +
              system.canvas.clientHeight / 2,
            currentParticle.rad / (currentParticle.z - this.cam.z / 600),
            0,
            Math.PI * 2
          );
        }
        canvas.fill();
      }
      //	console.log(groupData.glowParticles)
      var ordered = this.orderArray(groupData.glowParticles);
      for (var i = 0; i < groupData.glowParticles.length; i++) {
        currentParticle = groupData.glowParticles[ordered[i]];
        if (currentParticle.type == 0) {
          canvas.beginPath();
          color =
            currentParticle.color.split("(")[0] +
            "a(" +
            currentParticle.color.split("(")[1].split(")")[0] +
            "," +
            currentParticle.alpha +
            ")";
          canvas.fillStyle = color;
          if (currentParticle.z + currentParticle.offZ - this.cam.z / 600 > 0) {
            //console.log(currentParticle.rad/(currentParticle.z-this.cam.z))
            canvas.arc(
              (currentParticle.x - this.cam.x + currentParticle.offX) /
                (currentParticle.z - this.cam.z / 600 + currentParticle.offZ) +
                system.canvas.clientWidth / 2,
              (currentParticle.y - this.cam.y + currentParticle.offY) /
                (currentParticle.z - this.cam.z / 600 + currentParticle.offZ) +
                system.canvas.clientHeight / 2,
              currentParticle.rad /
                (currentParticle.z - this.cam.z / 600 + currentParticle.offZ),
              0,
              Math.PI * 2
            );
          }
          canvas.fill();
        } else {
          canvas.beginPath();
          color =
            currentParticle.color.split("(")[0] +
            "a(" +
            currentParticle.color.split("(")[1].split(")")[0] +
            "," +
            currentParticle.alpha +
            ")";
          canvas.fillStyle = color;
          if (currentParticle.z - this.cam.z / 600 > 0) {
            canvas.arc(
              (currentParticle.x - this.cam.x) /
                (currentParticle.z - this.cam.z / 600) +
                system.canvas.clientWidth / 2,
              (currentParticle.y - this.cam.y) /
                (currentParticle.z - this.cam.z / 600) +
                system.canvas.clientHeight / 2,
              currentParticle.rad / (currentParticle.z - this.cam.z / 600),
              0,
              Math.PI * 2
            );
          }
          canvas.fill();
        }
      }
      if (groupData.preProcess.active) {
        groupData.preProcess.frames++;
        groupData.preProcess.time =
          groupData.preProcess.frames * (1 / this.frameRate);
        groupData.preProcess.particlesLeft =
          groupData.particles.length + groupData.glowParticles.length;
        var image = groupData.preProcess.canvas.toDataURL();

        groupData.preProcess.images.push(image);
      }
    },
    update2DGroup: function (groupData) {
      var system = particleSystem.allSystems[this.system],
        currentParticle;
      for (var i = groupData.particles.length - 1; i >= 0; i--) {
        currentParticle = groupData.particles[i];
        currentParticle.x += currentParticle.xv / (this.frameRate * 5);
        currentParticle.y += currentParticle.yv / (this.frameRate * 5);
        currentParticle.xv /= this.airResistance / (this.frameRate * 5) + 1;
        currentParticle.yv /= this.airResistance / (this.frameRate * 5) + 1;
        currentParticle.alpha -= groupData.fade / (this.frameRate * 5);

        if (this.floor !== undefined && currentParticle.y > this.floor) {
          currentParticle.yv /= (this.friction + 1) * -1;
          currentParticle.y +=
            (currentParticle.yv / (this.frameRate * 5)) * (this.friction + 1);
          currentParticle.colition = true;
        } else if (currentParticle.gravity) {
          currentParticle.yv += (this.gravity / this.frameRate) * 30;
        }
        this.removeParticle(
          currentParticle,
          groupData.particles,
          i,
          true,
          groupData.glowParticles
        );
      }
      for (var i = 0; i < groupData.glowParticles.length; i++) {
        currentParticle = groupData.glowParticles[i];
        if (currentParticle.type == 0) {
          if (!currentParticle.deleted) {
            currentParticle.xv =
              groupData.particles[currentParticle.index].xv /
              (this.frameRate * 5) /
              currentParticle.drag;
            currentParticle.yv =
              groupData.particles[currentParticle.index].yv /
              (this.frameRate * 5) /
              currentParticle.drag;
          }

          currentParticle.x += currentParticle.xv;
          currentParticle.y += currentParticle.yv;
          currentParticle.alpha -=
            (currentParticle.alphaFade / (this.frameRate * 5)) * 18;
        } else {
          currentParticle.x += currentParticle.xv / (this.frameRate * 5);
          currentParticle.y += currentParticle.xv / (this.frameRate * 5);
          currentParticle.alpha -=
            ((currentParticle.alphaFade * 3) / (this.frameRate * 5)) * 18;
        }
        this.removeParticle(currentParticle, groupData.glowParticles, i, false);
      }
    },

    update3DGroup: function (groupData) {
      var system = particleSystem.allSystems[this.system],
        currentParticle;
      for (var i = groupData.particles.length - 1; i >= 0; i--) {
        currentParticle = groupData.particles[i];
        currentParticle.x += currentParticle.xv / (this.frameRate * 5);
        currentParticle.y += currentParticle.yv / (this.frameRate * 5);
        currentParticle.z += currentParticle.zv / (this.frameRate * 5);
        currentParticle.zv /= this.airResistance / (this.frameRate * 5) + 1;
        currentParticle.xv /= this.airResistance / (this.frameRate * 5) + 1;
        currentParticle.yv /= this.airResistance / (this.frameRate * 5) + 1;
        currentParticle.alpha -= groupData.fade / (this.frameRate * 5);

        if (
          this.floor !== undefined &&
          currentParticle.y > this.floor / currentParticle.z
        ) {
          currentParticle.yv /= (this.friction + 1) * -1;
          currentParticle.y +=
            (currentParticle.yv / (this.frameRate * 5)) * (this.friction + 1);
          currentParticle.colition = true;
        } else if (currentParticle.gravity) {
          currentParticle.yv += (this.gravity / this.frameRate) * 30;
        }
        this.removeParticle(
          currentParticle,
          groupData.particles,
          i,
          true,
          groupData.glowParticles
        );
      }
      for (var i = 0; i < groupData.glowParticles.length; i++) {
        currentParticle = groupData.glowParticles[i];
        if (currentParticle.type == 0) {
          if (!currentParticle.deleted) {
            currentParticle.xv =
              groupData.particles[currentParticle.index].xv /
              (this.frameRate * 5) /
              currentParticle.drag;
            currentParticle.yv =
              groupData.particles[currentParticle.index].yv /
              (this.frameRate * 5) /
              currentParticle.drag;
            currentParticle.zv =
              groupData.particles[currentParticle.index].zv /
              (this.frameRate * 5) /
              currentParticle.drag;
          } else if (currentParticle.xv == undefined) {
            groupData.glowParticles.splice(i, 1);
          }
          currentParticle.x += currentParticle.xv;
          currentParticle.y += currentParticle.yv;
          currentParticle.z += currentParticle.zv;
          currentParticle.alpha -=
            (currentParticle.alphaFade / (this.frameRate * 5)) * 18;
        } else {
          currentParticle.x += currentParticle.xv;
          currentParticle.y += currentParticle.yv;
          currentParticle.z += currentParticle.zv;
          currentParticle.alpha -=
            (currentParticle.alphaFade / (this.frameRate * 5)) * 18;
        }
        this.removeParticle(currentParticle, groupData.glowParticles, i, false);
      }
    },
    removeParticle: function (particle, nest, index, group, glowData) {
      var system = particleSystem.allSystems[this.system],
        removed = false;
      if (particle.colition && this.clip.colition) {
        removed = true;
      }
      var time = new Date();
      if (this.clip.timeout !== false) {
        if (
          (time.getTime() - particle.timeStamp.getTime()) / 1000 >=
          this.clip.timeout
        ) {
          removed = true;
        }
      }
      var parOffScreen;
      if (system.dim == 2) {
        parOffScreen =
          particle.x -
            this.cam.x +
            system.canvas.clientWidth / 2 -
            particle.rad >
            system.canvas.clientWidth ||
          particle.y -
            this.cam.y +
            system.canvas.clientHeight / 2 -
            particle.rad >
            system.canvas.clientHeight ||
          particle.x -
            this.cam.x +
            system.canvas.clientWidth / 2 +
            particle.rad <
            0 ||
          particle.y -
            this.cam.y +
            system.canvas.clientWidth / 2 +
            particle.rad * 3 <
            0;
      } else {
        var xPos =
          (particle.x - this.cam.x) / (particle.z - this.cam.z / 600) +
          system.canvas.clientWidth / 2;
        var yPos =
          (particle.y - this.cam.y) / (particle.z - this.cam.z / 600) +
          system.canvas.clientHeight / 2;
        var particleRad = particle.rad / (particle.z - this.cam.z / 600);
        parOffScreen =
          xPos - particleRad > system.canvas.clientWidth ||
          xPos + particleRad < 0 ||
          yPos - particleRad > system.canvas.clientHeight ||
          yPos + particleRad < 0 ||
          particle.z - this.cam.z / 600 + particleRad <= 0;
        if (this.clip.zDistance !== undefined) {
          parOffScreen =
            parOffScreen ||
            particle.z - this.cam.z / 600 - particleRad >
              this.clip.zDistance / 600;
        }
      }

      if (this.clip.offScreen && parOffScreen) {
        removed = true;
      }
      if (particle.alpha <= 0 && this.clip.fade) {
        removed = true;
      }

      var iteration = 0;
      if (group && removed) {
        for (var i = 0; i < glowData.length; i++) {
          if (glowData[i].type == 0) {
            if (glowData[i].index == index && !glowData[i].deleted) {
              glowData[i].deleted = true;
            }
            if (glowData[i].index > index) {
              glowData[i].index -= 1;
            }
            iteration++;
          }
        }
      }
      if (removed) {
        nest.splice(index, 1);
      }
    },
    stopLoopFrames: function () {
      this.rendering = false;
      clearInterval(this.loop);
    }
  }
};
