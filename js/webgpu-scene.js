import { mat4, vec3 } from 'gl-matrix';

// Set up a small WebGPU scene

const swapFormat = "bgra8unorm";
const depthFormat = "depth24plus";
const sampleCount = 4;

const uniformBufferSize = 4 * 16; // 4x4 matrix

const Cube = {
  vertexShader: {
    code: `
    [[block]] struct Uniforms {
      modelViewProjectionMatrix : mat4x4<f32>;
    };
    [[set(0), binding(0)]] var<uniform> uniforms : Uniforms;
    
    struct VertexInput {
      [[location(0)]] position : vec4<f32>;
      [[location(1)]] color : vec4<f32>;
      [[location(2)]] uv : vec2<f32>;
    };
  
    struct VertexOutput {
      [[location(0)]] color : vec4<f32>;
      [[location(1)]] uv : vec2<f32>;
      [[builtin(position)]] position : vec4<f32>;
    };
  
    [[stage(vertex)]]
    fn vertMain(input : VertexInput) -> VertexOutput {
      var output : VertexOutput;
      output.color = input.color;
      output.uv = input.uv;
      output.position = uniforms.modelViewProjectionMatrix * input.position;
      return output;
    }
    `,
    entryPoint: 'vertMain'
  },
  fragmentShader: {
    code: `
    [[set(0), binding(1)]] var externalTexture : texture_2d<f32>;
    [[set(0), binding(2)]] var externalSampler : sampler;

    struct FragmentInput {
      [[location(0)]] color : vec4<f32>;
      [[location(1)]] uv : vec2<f32>;
    };

    [[stage(fragment)]]
    fn fragMain(input : FragmentInput) -> [[location(0)]] vec4<f32> {
      return input.color * textureSample(externalTexture, externalSampler, input.uv);
    }
    `,
    entryPoint: 'fragMain'
  },
  layout: {
    arrayStride: 4 * 10, // Byte size of one cube vertex
    attributes: [{
      // position
      shaderLocation: 0,
      offset: 0,
      format: "float32x4"
    }, {
      // color
      shaderLocation: 1,
      offset: 4 * 4,
      format: "float32x4"
    },
    {
      // UV
      shaderLocation: 2,
      offset: 4 * 8,
      format: "float32x2"
    }]
  },
  vertexCount: 36,
  vertexArray: new Float32Array([
    // float4 position, float4 color, float2 uv,
    1, -1, 1, 1,   1, 0, 1, 1,  1, 1,
    -1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
    -1, -1, -1, 1, 0, 0, 0, 1,  0, 0,
    1, -1, -1, 1,  1, 0, 0, 1,  1, 0,
    1, -1, 1, 1,   1, 0, 1, 1,  1, 1,
    -1, -1, -1, 1, 0, 0, 0, 1,  0, 0,

    1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
    1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
    1, -1, -1, 1,  1, 0, 0, 1,  0, 0,
    1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
    1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
    1, -1, -1, 1,  1, 0, 0, 1,  0, 0,

    -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
    1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
    1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
    -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
    -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
    1, 1, -1, 1,   1, 1, 0, 1,  0, 0,

    -1, -1, 1, 1,  0, 0, 1, 1,  1, 1,
    -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
    -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
    -1, -1, -1, 1, 0, 0, 0, 1,  1, 0,
    -1, -1, 1, 1,  0, 0, 1, 1,  1, 1,
    -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,

    1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
    -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
    -1, -1, 1, 1,  0, 0, 1, 1,  0, 0,
    -1, -1, 1, 1,  0, 0, 1, 1,  0, 0,
    1, -1, 1, 1,   1, 0, 1, 1,  1, 0,
    1, 1, 1, 1,    1, 1, 1, 1,  1, 1,

    1, -1, -1, 1,  1, 0, 0, 1,  1, 1,
    -1, -1, -1, 1, 0, 0, 0, 1,  0, 1,
    -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
    1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
    1, -1, -1, 1,  1, 0, 0, 1,  1, 1,
    -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
  ])
};

export class WebGPUScene {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('gpupresent');

    this.viewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
    this.modelViewProjectionMatrix = mat4.create();

    this.init();
  }

  async init() {
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();
    
    this.vertexBuffer = this.device.createBuffer({
      size: Cube.vertexArray.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.vertexBuffer, 0, Cube.vertexArray.buffer);

    this.pipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({ code: Cube.vertexShader.code }),
        entryPoint: Cube.vertexShader.entryPoint,
        buffers: [Cube.layout],
      },
      fragment: {
        module: this.device.createShaderModule({ code: Cube.fragmentShader.code }),
        entryPoint: Cube.fragmentShader.entryPoint,
        targets: [{
          format: swapFormat,
        }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
      },
      depthStencil: {
        format: depthFormat,
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
      multisample: {
        count: sampleCount,
      },
    });

    this.renderPassDescriptor = {
      colorAttachments: [{
        // view is acquired and set in render loop.
        view: undefined,
        resolveTarget: undefined,

        loadValue: { r: 0.0, g: 0.5, b: 0.0, a: 1.0 },
        storeOp: 'store'
      }],
      depthStencilAttachment: {
        // view is acquired and set in render loop.
        view: undefined,

        depthLoadValue: 1.0,
        depthStoreOp: 'store',
        stencilLoadValue: 0,
        stencilStoreOp: 'store',
      }
    };

    window.addEventListener('resize', () => { this.onResize(); });
    this.onResize();

    this.uniformBuffer = this.device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.externalTexture = this.device.createTexture({
      format: swapFormat,
      size: {width: 1024, height: 1024},
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.SAMPLED,
    });

    this.externalSampler = this.device.createSampler({});

    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer, },
      }, {
        binding: 1,
        resource: this.externalTexture.createView(),
      }, {
        binding: 2,
        resource: this.externalSampler,
      }],
    });
  }

  onResize() {
    const size = {
      width: window.innerWidth * 0.5,
      height: window.innerHeight
    };

    this.context.configure({
      device: this.device,
      format: swapFormat,
      size,
    });

    this.colorTexture = this.device.createTexture({
      format: swapFormat,
      sampleCount,
      size,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.renderPassDescriptor.colorAttachments[0].view = this.colorTexture.createView();

    this.depthTexture = this.device.createTexture({
      format: depthFormat,
      sampleCount,
      size,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    this.renderPassDescriptor.depthStencilAttachment.view = this.depthTexture.createView();

    const aspect = Math.abs(size.width / size.height);
    mat4.perspective(this.projectionMatrix, Math.PI * 0.4, aspect, 0.1, 1000.0);

    //this.boop = true;
  }

  get transformationMatrix() {
    mat4.identity(this.viewMatrix);
    mat4.translate(this.viewMatrix, this.viewMatrix, vec3.fromValues(0, 0, -3));
    const now = Date.now() / 5000;
    mat4.rotate(this.viewMatrix, this.viewMatrix, 1, vec3.fromValues(Math.sin(now), Math.cos(now), 0));

    mat4.multiply(this.modelViewProjectionMatrix, this.projectionMatrix, this.viewMatrix);

    return this.modelViewProjectionMatrix;
  }

  async updateExternalTexture(source) {
    if (!this.device) { return; }

    this.device.queue.copyExternalImageToTexture({
      source,
    }, {
      texture: this.externalTexture,
    }, {
      width: Math.min(1024, source.width),
      height: Math.min(1024, source.height)
    });

    ///this.boop = false;
  }

  render() {
    if (!this.device) { return; }

    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.transformationMatrix);

    this.renderPassDescriptor.colorAttachments[0].resolveTarget = this.context.getCurrentTexture().createView();

    const commandEncoder = this.device.createCommandEncoder({});
    const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);

    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.uniformBindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.draw(Cube.vertexCount, 1, 0, 0);
    passEncoder.endPass();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}