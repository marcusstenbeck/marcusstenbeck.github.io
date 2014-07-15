(function() {
  var animate, camDist, camPitch, camProj, camRot, camView, canvas, params, container, controls, counter, cubeGeom, displayShader, draw, fullscreenImg, gl, hover, lightProj, lightRot, lightView, model, mousemove, mouseup, name, offset, planeGeom;

  name = 'no-shadow';

  document.write("<div id=\"" + name + "\" class=\"example\"></div>");

  container = $('#' + name);

  canvas = $('<canvas></canvas>').appendTo(container)[0];

  params = {
    antialias: false
  };

  try {
    gl = new WebGLFramework(canvas, params).depthTest();
  } catch (error) {
    container.empty();
    $('<div class="error"></div>').text(error).appendTo(container);
    $('<div class="error-info"></div>').text('(screenshot instead)').appendTo(container);
    $("<img src=\"" + name + ".png\">").appendTo(container);
    return;
  }

  cubeGeom = gl.drawable(meshes.cube);

  planeGeom = gl.drawable(meshes.plane(50));

  displayShader = gl.shader({
    common: '#line 55 hard-shadow.coffee\nvarying vec3 vWorldNormal; varying vec4 vWorldPosition;\nuniform mat4 camProj, camView;\nuniform mat4 lightProj, lightView; uniform mat3 lightRot;\nuniform mat4 model;',
    vertex: '#line 61 hard-shadow.coffee\nattribute vec3 position, normal;\n\nvoid main(){\n    vWorldNormal = normal;\n    vWorldPosition = model * vec4(position, 1.0);\n    gl_Position = camProj * camView * vWorldPosition;\n}',
    fragment: '#line 70 hard-shadow.coffee\nuniform sampler2D sLightDepth;\n\nfloat attenuation(vec3 dir){\n    float dist = length(dir);\n    float radiance = 1.0/(1.0+pow(dist/10.0, 2.0));\n    return clamp(radiance*10.0, 0.0, 1.0);\n}\n\nfloat influence(vec3 normal, float coneAngle){\n    float minConeAngle = ((360.0-coneAngle-10.0)/360.0)*PI;\n    float maxConeAngle = ((360.0-coneAngle)/360.0)*PI;\n    return smoothstep(minConeAngle, maxConeAngle, acos(normal.z));\n}\n\nfloat lambert(vec3 surfaceNormal, vec3 lightDirNormal){\n    return max(0.0, dot(surfaceNormal, lightDirNormal));\n}\n\nvec3 skyLight(vec3 normal){\n    return vec3(smoothstep(0.0, PI, PI-acos(normal.y)))*0.4;\n}\n\nvec3 gamma(vec3 color){\n    return pow(color, vec3(2.2));\n}\n\nvoid main(){\n    vec3 worldNormal = normalize(vWorldNormal);\n\n    vec3 camPos = (camView * vWorldPosition).xyz;\n    vec3 lightPos = (lightView * vWorldPosition).xyz;\n    vec3 lightPosNormal = normalize(lightPos);\n    vec3 lightSurfaceNormal = lightRot * worldNormal;\n    vec4 lightDevice = lightProj * vec4(lightPos, 1.0);\n    vec2 lightDeviceNormal = lightDevice.xy/lightDevice.w;\n    vec2 lightUV = lightDeviceNormal*0.5+0.5;\n\n    // shadow calculation\n    float lightDepth1 = texture2D(sLightDepth, lightUV).r;\n    float lightDepth2 = clamp(length(lightPos)/40.0, 0.0, 1.0);\n    float bias = 0.001;\n    float illuminated = step(lightDepth2, lightDepth1+bias);\n    \n    vec3 excident = (\n        skyLight(worldNormal) +\n        lambert(lightSurfaceNormal, -lightPosNormal) *\n        influence(lightPosNormal, 55.0) *\n        attenuation(lightPos) *\n        illuminated\n    );\n    gl_FragColor = vec4(gamma(excident), 1.0);\n}'
  });

  lightShader = gl.shader({
    common: '#line 126 hard-shadow.coffee\nvarying vec3 vWorldNormal; varying vec4 vWorldPosition;\nuniform mat4 lightProj, lightView; uniform mat3 lightRot;\nuniform mat4 model;',
    vertex: '#line 131 hard-shadow.coffee\nattribute vec3 position, normal;\n\nvoid main(){\n    vWorldNormal = normal;\n    vWorldPosition = model * vec4(position, 1.0);\n    gl_Position = lightProj * lightView * vWorldPosition;\n}',
    fragment: '#line 140 hard-shadow.coffee\nvoid main(){\n    vec3 worldNormal = normalize(vWorldNormal);\n    vec3 lightPos = (lightView * vWorldPosition).xyz;\n    float depth = clamp(length(lightPos)/40.0, 0.0, 1.0);\n    gl_FragColor = vec4(vec3(depth), 1.0);\n}'
  });

  lightDepthTexture = gl.texture({
    type: floatExt.type,
    channels: 'rgba'
  }).bind().setSize(64, 64).clampToEdge();

  if (floatExt.filterable) {
    lightDepthTexture.linear();
  } else {
    lightDepthTexture.nearest();
  }

  lightFramebuffer = gl.framebuffer().bind().color(lightDepthTexture).depth().unbind();

  camProj = gl.mat4();

  camView = gl.mat4();

  lightProj = gl.mat4().perspective({
    fov: 60
  }, 1, {
    near: 0.01,
    far: 100
  });

  lightView = gl.mat4().trans(0, 0, -6).rotatex(30).rotatey(110);

  lightRot = gl.mat3().fromMat4Rot(lightView);

  model = gl.mat4();

  counter = -Math.PI * 0.5;

  offset = 0;

  camDist = 10;

  camRot = 55;

  camPitch = 41;

  mouseup = function() {
    return $(document).unbind('mousemove', mousemove).unbind('mouseup', mouseup);
  };

  mousemove = function(_arg) {
    var originalEvent, x, y, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
    originalEvent = _arg.originalEvent;
    x = (_ref = (_ref1 = (_ref2 = originalEvent.movementX) != null ? _ref2 : originalEvent.webkitMovementX) != null ? _ref1 : originalEvent.mozMovementX) != null ? _ref : originalEvent.oMovementX;
    y = (_ref3 = (_ref4 = (_ref5 = originalEvent.movementY) != null ? _ref5 : originalEvent.webkitMovementY) != null ? _ref4 : originalEvent.mozMovementY) != null ? _ref3 : originalEvent.oMovementY;
    camRot += x;
    camPitch += y;
    if (camPitch > 85) {
      return camPitch = 85;
    } else if (camPitch < 1) {
      return camPitch = 1;
    }
  };

  $(canvas).bind('mousedown', function() {
    $(document).bind('mousemove', mousemove).bind('mouseup', mouseup);
    return false;
  }).bind('mousewheel', function(_arg) {
    var originalEvent;
    originalEvent = _arg.originalEvent;
    camDist -= originalEvent.wheelDeltaY / 250;
    return false;
  }).bind('DOMMouseScroll', function(_arg) {
    var originalEvent;
    originalEvent = _arg.originalEvent;
    camDist += originalEvent.detail / 5;
    return false;
  });

  drawScene = function(shader) {
    return shader.mat4('model', model.ident().trans(0, 0, 0)).draw(planeGeom).mat4('model', model.ident().trans(0, 1 + offset, 0)).draw(cubeGeom).mat4('model', model.ident().trans(5, 1, -1)).draw(cubeGeom);
  };

  drawLight = function() {
    lightFramebuffer.bind();
    gl.viewport(0, 0, lightDepthTexture.width, lightDepthTexture.height).clearColor(1, 1, 1, 1).clearDepth(1).cullFace('front');
    lightShader.use().mat4('lightView', lightView).mat4('lightProj', lightProj).mat3('lightRot', lightRot);
    drawScene(lightShader);
    return lightFramebuffer.unbind();
  };

  drawCamera = function() {
    gl.adjustSize().viewport().cullFace('back').clearColor(0, 0, 0, 0).clearDepth(1);
    camProj.perspective({
      fov: 60,
      aspect: gl.aspect,
      near: 0.01,
      far: 100
    });
    camView.ident().trans(0, -1, -camDist).rotatex(camPitch).rotatey(camRot);
    displayShader.use().mat4('camProj', camProj).mat4('camView', camView).mat4('lightView', lightView).mat4('lightProj', lightProj).mat3('lightRot', lightRot).sampler('sLightDepth', lightDepthTexture);
    return drawScene(displayShader);
  };

  draw = function() {
    drawLight();
    return drawCamera();
  };

  draw();

  gl.animationInterval(function() {
    if (hover) {
      if (animate) {
        offset = 1 + Math.sin(counter);
        counter += 1 / 30;
      } else {
        offset = 0;
      }
      return draw();
    }
  });

}).call(this);
