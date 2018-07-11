import Vinyl from 'vinyl';
import mozJpegPlugin from 'imagemin-mozjpeg';
import SrcsetGenerator from '../src';
import { attachMetadata } from '../src/helpers';
import image, { expectedSize } from './image';

const optimization = {
	jpg: mozJpegPlugin({
		quality: 80
	})
};

jest.setTimeout(30000);

async function arrayFromAsyncIterator<T>(iterator): Promise<T[]> {

	const array: T[] = [];

	for await (const item of iterator) {
		array.push(item);
	}

	return array;
}

describe('SrcsetGenerator', () => {

	it('should create correct instance', () => {

		const srcset = new SrcsetGenerator();

		expect(typeof srcset.generate).toBe('function');
	});

	it('should skip optimization', async () => {

		const srcset = new SrcsetGenerator({
			skipOptimization: true,
			optimization
		});
		const [notOptimizedImage] = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image));

		expect((notOptimizedImage.contents as Buffer).length).toBe(image.contents.length);
	});

	it('should optimize', async () => {

		const srcset = new SrcsetGenerator({
			optimization
		});
		const [optimizedImage] = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image));

		expect((optimizedImage.contents as Buffer).length).toBeLessThan(image.contents.length);
	});

	it('should skip scaling up', async () => {

		const srcset = new SrcsetGenerator({
			skipOptimization: true,
			scalingUp: false
		});
		const images = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image, {
			width: [1, 5000]
		}));

		expect(images.length).toBe(1);
	});

	it('should scaling up', async () => {

		const srcset = new SrcsetGenerator({
			skipOptimization: true
		});
		const images = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image, {
			width: [1, 5000]
		}));

		expect(images.length).toBe(2);
	});

	it('should add default postfix', async () => {

		const srcset = new SrcsetGenerator({
			skipOptimization: true
		});
		const [imageWithPostfix] = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image, {
			width: [320]
		}));

		expect(imageWithPostfix.stem).toBe('image@320w');
	});

	it('should add custom postfix', async () => {

		const srcset = new SrcsetGenerator({
			skipOptimization: true,
			postfix: '@postfix'
		});
		const [imageWithPostfix] = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image));

		expect(imageWithPostfix.stem).toBe('image@postfix');
	});

	describe('#generate', () => {

		const srcset = new SrcsetGenerator({
			skipOptimization: true
		});

		it('should throw error if format is not supported', async () => {

			const bmp = image.clone({ contents: false });

			bmp.extname = '.bmp';

			expect(
				arrayFromAsyncIterator<Vinyl>(srcset.generate(bmp))
			).rejects.toThrow();
		});

		it('should skip optimization', async () => {

			const srcset = new SrcsetGenerator({
				optimization
			});
			const [notOptimizedImage] = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image, {
				skipOptimization: true
			}));

			expect((notOptimizedImage.contents as Buffer).length).toBe(image.contents.length);
		});

		it('should skip scaling up', async () => {

			const images = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image, {
				scalingUp: false,
				width: [1, 5000]
			}));

			expect(images.length).toBe(1);
		});

		it('should add custom postfix', async () => {

			const [imageWithPostfix] = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image, {
				postfix: '@postfix'
			}));

			expect(imageWithPostfix.stem).toBe('image@postfix');
		});

		it('should generate desired widths', async () => {

			const images = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image, {
				width: [1, 1280, 320]
			}));

			await Promise.all(
				images.map(attachMetadata)
			);

			expect(images.length).toBe(3);
			expect(images[0].metadata.width).toBe(expectedSize.width);
			expect(images[1].metadata.width).toBe(1280);
			expect(images[2].metadata.width).toBe(320);
		});

		it('should generate desired formats', async () => {

			const images = await arrayFromAsyncIterator<Vinyl>(srcset.generate(image, {
				format: ['jpg', 'webp', 'png']
			}));

			expect(images.length).toBe(3);
			expect(images[0].extname).toBe('.jpg');
			expect(images[1].extname).toBe('.webp');
			expect(images[2].extname).toBe('.png');
		});

		it('should throw error if desired format is not supported', async () => {

			expect(
				arrayFromAsyncIterator<Vinyl>(srcset.generate(image, {
					format: 'bmp'
				} as any))
			).rejects.toThrow();
		});
	});
});