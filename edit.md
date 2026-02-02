# Edit with Ideogram 3.0

POST https://api.ideogram.ai/v1/ideogram-v3/edit
Content-Type: multipart/form-data

Edit a given image synchronously using the provided mask with Ideogram 3.0. The mask indicates which part of the image
should be edited, while the prompt and chosen style can further guide the edit.

Supported image formats include JPEG, PNG, and WebP.

Images links are available for a limited period of time; if you would like to keep the image, you must download it.


Reference: https://developer.ideogram.ai/api-reference/api-reference/edit-v3

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Edit with Ideogram 3.0
  version: endpoint_generate.post_edit_image_v3
paths:
  /v1/ideogram-v3/edit:
    post:
      operationId: post-edit-image-v-3
      summary: Edit with Ideogram 3.0
      description: >
        Edit a given image synchronously using the provided mask with Ideogram
        3.0. The mask indicates which part of the image

        should be edited, while the prompt and chosen style can further guide
        the edit.


        Supported image formats include JPEG, PNG, and WebP.


        Images links are available for a limited period of time; if you would
        like to keep the image, you must download it.
      tags:
        - - subpackage_generate
      parameters:
        - name: Api-Key
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Image edits generated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ImageGenerationResponseV3'
        '400':
          description: Invalid input provided.
          content: {}
        '401':
          description: Not authorized to generate an image.
          content: {}
        '422':
          description: Prompt or Initial Image failed the safety checks.
          content: {}
        '429':
          description: Too many requests.
          content: {}
      requestBody:
        description: A request to edit an image with Ideogram 3.0.
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                image:
                  type: string
                  format: binary
                  description: >-
                    The image being edited (max size 10MB); only JPEG, WebP and
                    PNG formats are supported at this time.
                mask:
                  type: string
                  format: binary
                  description: >-
                    A black and white image of the same size as the image being
                    edited (max size 10MB). Black regions in the mask should
                    match up with the regions of the image that you would like
                    to edit; only JPEG, WebP and PNG formats are supported at
                    this time.
                prompt:
                  type: string
                  description: The prompt used to describe the edited result.
                magic_prompt:
                  $ref: '#/components/schemas/MagicPromptOption'
                num_images:
                  $ref: '#/components/schemas/NumImages'
                seed:
                  $ref: '#/components/schemas/Seed'
                rendering_speed:
                  $ref: '#/components/schemas/RenderingSpeed'
                style_type:
                  $ref: '#/components/schemas/StyleTypeV3'
                style_preset:
                  $ref: '#/components/schemas/StylePresetV3'
                color_palette:
                  $ref: '#/components/schemas/ColorPaletteWithPresetNameOrMembers'
                style_codes:
                  $ref: '#/components/schemas/StyleCodes'
                style_reference_images:
                  type: array
                  items:
                    type: string
                    format: binary
                  description: >-
                    A set of images to use as style references (maximum total
                    size 10MB across all style references). The images should be
                    in JPEG, PNG or WebP format.
                character_reference_images:
                  type: array
                  items:
                    type: string
                    format: binary
                  description: >-
                    Generations with character reference are subject to the
                    character reference pricing. A set of images to use as
                    character references (maximum total size 10MB across all
                    character references), currently only supports 1 character
                    reference image. The images should be in JPEG, PNG or WebP
                    format.
                character_reference_images_mask:
                  type: array
                  items:
                    type: string
                    format: binary
                  description: >-
                    Optional masks for character reference images. When
                    provided, must match the number of
                    character_reference_images. Each mask should be a grayscale
                    image of the same dimensions as the corresponding character
                    reference image. The images should be in JPEG, PNG or WebP
                    format.
              required:
                - image
                - mask
                - prompt
components:
  schemas:
    MagicPromptOption:
      type: string
      enum:
        - value: AUTO
        - value: 'ON'
        - value: 'OFF'
    NumImages:
      type: integer
      default: 1
    Seed:
      type: integer
    RenderingSpeed:
      type: string
      enum:
        - value: FLASH
        - value: TURBO
        - value: DEFAULT
        - value: QUALITY
      default: DEFAULT
    StyleTypeV3:
      type: string
      enum:
        - value: AUTO
        - value: GENERAL
        - value: REALISTIC
        - value: DESIGN
        - value: FICTION
      default: GENERAL
    StylePresetV3:
      type: string
      enum:
        - value: 80S_ILLUSTRATION
        - value: 90S_NOSTALGIA
        - value: ABSTRACT_ORGANIC
        - value: ANALOG_NOSTALGIA
        - value: ART_BRUT
        - value: ART_DECO
        - value: ART_POSTER
        - value: AURA
        - value: AVANT_GARDE
        - value: BAUHAUS
        - value: BLUEPRINT
        - value: BLURRY_MOTION
        - value: BRIGHT_ART
        - value: C4D_CARTOON
        - value: CHILDRENS_BOOK
        - value: COLLAGE
        - value: COLORING_BOOK_I
        - value: COLORING_BOOK_II
        - value: CUBISM
        - value: DARK_AURA
        - value: DOODLE
        - value: DOUBLE_EXPOSURE
        - value: DRAMATIC_CINEMA
        - value: EDITORIAL
        - value: EMOTIONAL_MINIMAL
        - value: ETHEREAL_PARTY
        - value: EXPIRED_FILM
        - value: FLAT_ART
        - value: FLAT_VECTOR
        - value: FOREST_REVERIE
        - value: GEO_MINIMALIST
        - value: GLASS_PRISM
        - value: GOLDEN_HOUR
        - value: GRAFFITI_I
        - value: GRAFFITI_II
        - value: HALFTONE_PRINT
        - value: HIGH_CONTRAST
        - value: HIPPIE_ERA
        - value: ICONIC
        - value: JAPANDI_FUSION
        - value: JAZZY
        - value: LONG_EXPOSURE
        - value: MAGAZINE_EDITORIAL
        - value: MINIMAL_ILLUSTRATION
        - value: MIXED_MEDIA
        - value: MONOCHROME
        - value: NIGHTLIFE
        - value: OIL_PAINTING
        - value: OLD_CARTOONS
        - value: PAINT_GESTURE
        - value: POP_ART
        - value: RETRO_ETCHING
        - value: RIVIERA_POP
        - value: SPOTLIGHT_80S
        - value: STYLIZED_RED
        - value: SURREAL_COLLAGE
        - value: TRAVEL_POSTER
        - value: VINTAGE_GEO
        - value: VINTAGE_POSTER
        - value: WATERCOLOR
        - value: WEIRD
        - value: WOODBLOCK_PRINT
    ColorPalettePresetName:
      type: string
      enum:
        - value: EMBER
        - value: FRESH
        - value: JUNGLE
        - value: MAGIC
        - value: MELON
        - value: MOSAIC
        - value: PASTEL
        - value: ULTRAMARINE
    ColorPaletteWithPresetName:
      type: object
      properties:
        name:
          $ref: '#/components/schemas/ColorPalettePresetName'
      required:
        - name
    ColorPaletteMember:
      type: object
      properties:
        color_hex:
          type: string
          description: >-
            The hexadecimal representation of the color with an optional chosen
            weight.
        color_weight:
          type: number
          format: double
          description: The weight of the color in the color palette.
      required:
        - color_hex
    ColorPaletteWithMembers:
      type: object
      properties:
        members:
          type: array
          items:
            $ref: '#/components/schemas/ColorPaletteMember'
          description: >
            A list of ColorPaletteMembers that define the color palette. Each
            color palette member

            consists of a required color hex and an optional weight between 0.05
            and 1.0 (inclusive).

            It is recommended that these weights descend from highest to lowest
            for the color hexes provided.
      required:
        - members
    ColorPaletteWithPresetNameOrMembers:
      oneOf:
        - $ref: '#/components/schemas/ColorPaletteWithPresetName'
        - $ref: '#/components/schemas/ColorPaletteWithMembers'
    StyleCode:
      type: string
    StyleCodes:
      type: array
      items:
        $ref: '#/components/schemas/StyleCode'
    ResolutionV3:
      type: string
      enum:
        - value: 512x1536
        - value: 576x1408
        - value: 576x1472
        - value: 576x1536
        - value: 640x1344
        - value: 640x1408
        - value: 640x1472
        - value: 640x1536
        - value: 704x1152
        - value: 704x1216
        - value: 704x1280
        - value: 704x1344
        - value: 704x1408
        - value: 704x1472
        - value: 736x1312
        - value: 768x1088
        - value: 768x1216
        - value: 768x1280
        - value: 768x1344
        - value: 800x1280
        - value: 832x960
        - value: 832x1024
        - value: 832x1088
        - value: 832x1152
        - value: 832x1216
        - value: 832x1248
        - value: 864x1152
        - value: 896x960
        - value: 896x1024
        - value: 896x1088
        - value: 896x1120
        - value: 896x1152
        - value: 960x832
        - value: 960x896
        - value: 960x1024
        - value: 960x1088
        - value: 1024x832
        - value: 1024x896
        - value: 1024x960
        - value: 1024x1024
        - value: 1088x768
        - value: 1088x832
        - value: 1088x896
        - value: 1088x960
        - value: 1120x896
        - value: 1152x704
        - value: 1152x832
        - value: 1152x864
        - value: 1152x896
        - value: 1216x704
        - value: 1216x768
        - value: 1216x832
        - value: 1248x832
        - value: 1280x704
        - value: 1280x768
        - value: 1280x800
        - value: 1312x736
        - value: 1344x640
        - value: 1344x704
        - value: 1344x768
        - value: 1408x576
        - value: 1408x640
        - value: 1408x704
        - value: 1472x576
        - value: 1472x640
        - value: 1472x704
        - value: 1536x512
        - value: 1536x576
        - value: 1536x640
    ImageGenerationObjectV3:
      type: object
      properties:
        url:
          type:
            - string
            - 'null'
          format: uri
          description: The direct link to the image generated.
        prompt:
          type: string
          description: >-
            The prompt used for the generation. This may be different from the
            original prompt.
        resolution:
          $ref: '#/components/schemas/ResolutionV3'
        upscaled_resolution:
          type: string
          description: >-
            Output resolution, only used if operations alters image dimensions,
            such as upscale, crop etc.
        is_image_safe:
          type: boolean
          description: >-
            Whether this request passes safety checks. If false, the url field
            will be empty.
        seed:
          type: integer
          description: Random seed. Set for reproducible generation.
        style_type:
          $ref: '#/components/schemas/StyleTypeV3'
      required:
        - prompt
        - resolution
        - is_image_safe
        - seed
    ImageGenerationResponseV3:
      type: object
      properties:
        created:
          type: string
          format: date-time
          description: The time the request was created.
        data:
          type: array
          items:
            $ref: '#/components/schemas/ImageGenerationObjectV3'
          description: A list of ImageObjects that contain the generated image(s).
      required:
        - created
        - data

```

## SDK Code Examples

```python
import requests

response = requests.post(
  "https://api.ideogram.ai/v1/ideogram-v3/edit",
  headers={
    "Api-Key": "<apiKey>"
  },
  data={
    "prompt": "A photo of a cat wearing a hat.",
    "rendering_speed": "DEFAULT"
  },
  files={
    "image": open("<file1>", "rb"),
    "mask": open("<file1>", "rb"),
  }
)
print(response.json())
with open('output.png', 'wb') as f:
  f.write(requests.get(response.json()['data'][0]['url']).content)

```

```typescript
const formData = new FormData();
formData.append('prompt', 'A photo of a cat');
formData.append('rendering_speed', 'TURBO');
const response = await fetch('https://api.ideogram.ai/v1/ideogram-v3/edit', {
  method: 'POST',
  headers: { 'Api-Key': '<apiKey>' },
  body: formData
});
const data = await response.json();
console.log(data);

```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.ideogram.ai/v1/ideogram-v3/edit"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"image\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mask\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"prompt\"\r\n\r\nA photo of a cat wearing a hat.\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"magic_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_images\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"rendering_speed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_type\"\r\n\r\nAUTO\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_preset\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"color_palette\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_codes\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Api-Key", "<apiKey>")
	req.Header.Add("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.ideogram.ai/v1/ideogram-v3/edit")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Api-Key"] = '<apiKey>'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"image\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mask\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"prompt\"\r\n\r\nA photo of a cat wearing a hat.\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"magic_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_images\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"rendering_speed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_type\"\r\n\r\nAUTO\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_preset\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"color_palette\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_codes\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.ideogram.ai/v1/ideogram-v3/edit")
  .header("Api-Key", "<apiKey>")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"image\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mask\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"prompt\"\r\n\r\nA photo of a cat wearing a hat.\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"magic_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_images\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"rendering_speed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_type\"\r\n\r\nAUTO\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_preset\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"color_palette\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_codes\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.ideogram.ai/v1/ideogram-v3/edit', [
  'multipart' => [
    [
        'name' => 'image',
        'filename' => '<file1>',
        'contents' => null
    ],
    [
        'name' => 'mask',
        'filename' => '<file1>',
        'contents' => null
    ],
    [
        'name' => 'prompt',
        'contents' => 'A photo of a cat wearing a hat.'
    ],
    [
        'name' => 'style_type',
        'contents' => 'AUTO'
    ]
  ]
  'headers' => [
    'Api-Key' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.ideogram.ai/v1/ideogram-v3/edit");
var request = new RestRequest(Method.POST);
request.AddHeader("Api-Key", "<apiKey>");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"image\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mask\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"prompt\"\r\n\r\nA photo of a cat wearing a hat.\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"magic_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_images\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"rendering_speed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_type\"\r\n\r\nAUTO\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_preset\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"color_palette\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"style_codes\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "Api-Key": "<apiKey>",
  "Content-Type": "multipart/form-data; boundary=---011000010111000001101001"
]
let parameters = [
  [
    "name": "image",
    "fileName": "<file1>"
  ],
  [
    "name": "mask",
    "fileName": "<file1>"
  ],
  [
    "name": "prompt",
    "value": "A photo of a cat wearing a hat."
  ],
  [
    "name": "magic_prompt",
    "value": 
  ],
  [
    "name": "num_images",
    "value": 
  ],
  [
    "name": "seed",
    "value": 
  ],
  [
    "name": "rendering_speed",
    "value": 
  ],
  [
    "name": "style_type",
    "value": "AUTO"
  ],
  [
    "name": "style_preset",
    "value": 
  ],
  [
    "name": "color_palette",
    "value": 
  ],
  [
    "name": "style_codes",
    "value": 
  ]
]

let boundary = "---011000010111000001101001"

var body = ""
var error: NSError? = nil
for param in parameters {
  let paramName = param["name"]!
  body += "--\(boundary)\r\n"
  body += "Content-Disposition:form-data; name=\"\(paramName)\""
  if let filename = param["fileName"] {
    let contentType = param["content-type"]!
    let fileContent = String(contentsOfFile: filename, encoding: String.Encoding.utf8)
    if (error != nil) {
      print(error as Any)
    }
    body += "; filename=\"\(filename)\"\r\n"
    body += "Content-Type: \(contentType)\r\n\r\n"
    body += fileContent
  } else if let paramValue = param["value"] {
    body += "\r\n\r\n\(paramValue)"
  }
}

let request = NSMutableURLRequest(url: NSURL(string: "https://api.ideogram.ai/v1/ideogram-v3/edit")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```
